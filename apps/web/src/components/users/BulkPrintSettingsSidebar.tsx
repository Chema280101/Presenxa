import React from "react";
import {
  Building,
  Calendar,
  Check,
  ChevronDown,
  CreditCard,
  Download,
  FileText,
  Info,
  Layers,
  Palette,
  Printer,
  Users,
  X,
} from "lucide-react";
import {
  BRAND_COLOR_PRESETS,
  type CredentialBadgeOptions,
  type CredentialUser,
} from "./CredentialBadge";
import type { BacksideLayout, PreviewFace, SheetFormat } from "./BulkPrintSheet";

interface BulkPrintHeaderProps {
  users: CredentialUser[];
  activeUsersCount: number;
  excludedUserIds: string[];
  isUsersDropdownOpen: boolean;
  setIsUsersDropdownOpen: (open: boolean) => void;
  onClearExcluded: () => void;
  onToggleExcludeUser: (userId: string) => void;
  accentColor: string;
  isDownloading: boolean;
  isGeneratingQrs: boolean;
  totalPrintSheets: number;
  onDownloadPng: () => void;
  onPrint: () => void;
  onClose: () => void;
}

/**
 * Modal header for the credential print studio with quick collaborator filter and export actions.
 */
export function BulkPrintHeader({
  users,
  activeUsersCount,
  excludedUserIds,
  isUsersDropdownOpen,
  setIsUsersDropdownOpen,
  onClearExcluded,
  onToggleExcludeUser,
  accentColor,
  isDownloading,
  isGeneratingQrs,
  totalPrintSheets,
  onDownloadPng,
  onPrint,
  onClose,
}: BulkPrintHeaderProps) {
  const pillTextColor = accentColor === "#1F1F1F" ? "#334155" : accentColor;

  return (
    <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-surface-200 dark:border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-surface-950 shrink-0 z-20">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div
          className="w-9 h-9 rounded-xl border flex items-center justify-center shadow-inner shrink-0 transition-colors"
          style={{
            backgroundColor: `${accentColor}18`,
            borderColor: `${accentColor}35`,
            color: accentColor,
          }}
        >
          <Printer className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm sm:text-base font-black text-surface-900 dark:text-white leading-tight">
              {users.length === 1 ? "Impresión de Credencial" : "Estudio de Impresión de Credenciales"}
            </h2>

            {users.length > 1 ? (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setIsUsersDropdownOpen(!isUsersDropdownOpen)}
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border cursor-pointer transition-all hover:scale-105"
                  style={{
                    backgroundColor: `${accentColor}15`,
                    borderColor: `${accentColor}30`,
                    color: pillTextColor,
                  }}
                >
                  <Users className="w-3 h-3" />
                  <span>
                    {activeUsersCount} de {users.length} incluidos
                  </span>
                  <ChevronDown className="w-2.5 h-2.5 opacity-70" />
                </button>

                {isUsersDropdownOpen && (
                  <div className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-[#0f172a] rounded-xl shadow-xl border border-surface-200 dark:border-white/10 p-2 z-50 animate-scale-up text-xs">
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-surface-100 dark:border-white/10 text-[10px] font-bold text-surface-500 uppercase">
                      <span>Incluir en esta impresión</span>
                      <button
                        type="button"
                        onClick={onClearExcluded}
                        className="text-primary-600 hover:underline cursor-pointer"
                      >
                        Marcar todos
                      </button>
                    </div>
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {users.map((u) => {
                        const isIncluded = !excludedUserIds.includes(u.id);
                        return (
                          <label
                            key={`exclude-${u.id}`}
                            className="flex items-center justify-between p-1.5 rounded-lg hover:bg-surface-50 dark:hover:bg-white/5 cursor-pointer text-[11px]"
                          >
                            <span className="truncate mr-2 font-medium text-surface-800 dark:text-slate-200">
                              {u.firstName} {u.lastName}
                            </span>
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={() => onToggleExcludeUser(u.id)}
                              className="w-3.5 h-3.5 rounded text-primary-500 accent-emerald-500 cursor-pointer shrink-0"
                            />
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div
                className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider border shrink-0"
                style={{
                  backgroundColor: `${accentColor}15`,
                  borderColor: `${accentColor}30`,
                  color: pillTextColor,
                }}
              >
                <Users className="w-3 h-3" />
                <span>
                  {users[0]?.firstName} {users[0]?.lastName}
                </span>
              </div>
            )}
          </div>
          <p className="text-[11px] text-surface-500 dark:text-slate-400">
            {users.length === 1
              ? "Credencial oficial con QR fijo permanente (no caduca) lista para plastificar o imprimir en PVC"
              : "Pases oficiales con QR fijo permanente (no caducan) listos para plastificar o imprimir en PVC"}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 w-full sm:w-auto justify-end shrink-0">
        <button
          type="button"
          onClick={onDownloadPng}
          disabled={isDownloading || isGeneratingQrs}
          title="Descargar imágenes PNG en alta resolución para celular o WhatsApp"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 dark:border-white/10 bg-surface-100 hover:bg-surface-200 dark:bg-white/5 dark:hover:bg-white/10 text-surface-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
        >
          <Download className="w-3.5 h-3.5 text-primary-500" />
          <span>{isDownloading ? "Descargando..." : "Descargar PNG"}</span>
        </button>

        <button
          type="button"
          onClick={onPrint}
          disabled={isGeneratingQrs}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-white font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50"
          style={{
            backgroundColor: accentColor || "#00A650",
            boxShadow: `0 4px 14px 0 ${accentColor}40`,
          }}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>
            <span className="hidden xs:inline">Imprimir </span>({totalPrintSheets}{" "}
            {totalPrintSheets === 1 ? "hoja" : "hojas"})
          </span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-surface-400 hover:text-surface-700 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-white/10 transition cursor-pointer"
          aria-label="Cerrar estudio de impresión"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

interface BulkPrintSettingsSidebarProps {
  visibleOnMobile: boolean;
  usersCount: number;
  format: SheetFormat;
  setFormat: (f: SheetFormat) => void;
  backsideLayout: BacksideLayout;
  setBacksideLayout: (layout: BacksideLayout) => void;
  setPreviewFace: (face: PreviewFace) => void;
  options: CredentialBadgeOptions;
  updateOption: <K extends keyof CredentialBadgeOptions>(
    key: K,
    value: CredentialBadgeOptions[K]
  ) => void;
}

const VISIBLE_FIELD_TOGGLES: Array<{ key: keyof CredentialBadgeOptions; label: string }> = [
  { key: "showLogo", label: "Logo Hotel" },
  { key: "showAvatar", label: "Avatar" },
  { key: "showRole", label: "Cargo / Rol" },
  { key: "showDocumentId", label: "DNI / Doc" },
  { key: "showLocation", label: "Sede" },
  { key: "showToken", label: "Token ID" },
  { key: "showCropMarks", label: "Guías corte" },
];

function getA4CapacityLabel(
  usersCount: number,
  orientation: "vertical" | "horizontal"
): string {
  if (usersCount === 1) return "1 en hoja A4";
  return orientation === "vertical" ? "4 por hoja" : "6 por hoja";
}

/**
 * Left-hand configuration sidebar for credential layout, branding, backside, and visible fields.
 */
export function BulkPrintSettingsSidebar({
  visibleOnMobile,
  usersCount,
  format,
  setFormat,
  backsideLayout,
  setBacksideLayout,
  setPreviewFace,
  options,
  updateOption,
}: BulkPrintSettingsSidebarProps) {
  return (
    <div
      className={`w-full lg:w-72 p-4 bg-white dark:bg-surface-900/90 border-r border-surface-200 dark:border-surface-800 overflow-y-auto min-h-0 space-y-3.5 shrink-0 text-xs ${
        visibleOnMobile ? "block" : "hidden lg:block"
      }`}
    >
      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 mb-1 flex items-center gap-1">
          <FileText className="w-3 h-3 text-primary-500" />
          Formato de Salida
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            onClick={() => {
              setFormat("a4");
              updateOption("showCropMarks", true);
            }}
            className={`p-1.5 px-2 rounded-lg border text-left transition cursor-pointer ${
              format === "a4"
                ? "border-primary-500 bg-primary-50/50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                : "border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/5 text-surface-700 dark:text-slate-300"
            }`}
          >
            <div className="font-bold text-[11px]">Hoja A4</div>
            <div className="text-[9px] opacity-75">
              {getA4CapacityLabel(usersCount, options.orientation)}
            </div>
          </button>

          <button
            type="button"
            onClick={() => {
              setFormat("pvc");
              updateOption("showCropMarks", false);
            }}
            className={`p-1.5 px-2 rounded-lg border text-left transition cursor-pointer ${
              format === "pvc"
                ? "border-primary-500 bg-primary-50/50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                : "border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/5 text-surface-700 dark:text-slate-300"
            }`}
          >
            <div className="font-bold text-[11px]">Tarjeta PVC</div>
            <div className="text-[9px] opacity-75">1 por página</div>
          </button>
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 mb-1 flex items-center gap-1">
          <CreditCard className="w-3 h-3 text-primary-500" />
          Orientación
        </label>
        <div className="grid grid-cols-2 gap-1.5">
          {(
            [
              { value: "vertical", label: "Vertical (Gafete)" },
              { value: "horizontal", label: "Horizontal (Card)" },
            ] as const
          ).map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => updateOption("orientation", item.value)}
              className={`py-1 px-2 rounded-lg border text-center text-[11px] font-semibold transition cursor-pointer ${
                options.orientation === item.value
                  ? "border-primary-500 bg-primary-50/50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                  : "border-surface-200 dark:border-white/10 text-surface-600 dark:text-slate-300 hover:bg-surface-50 dark:hover:bg-white/5"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 mb-1 flex items-center gap-1">
          <Building className="w-3 h-3 text-primary-500" />
          Cabecera / Empresa
        </label>
        <input
          type="text"
          value={options.organizationName || ""}
          onChange={(e) => updateOption("organizationName", e.target.value)}
          placeholder="Ej: HOTEL ITALIA"
          className="w-full px-2.5 py-1 text-xs rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/10 text-surface-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 flex items-center gap-1">
            <Palette className="w-3 h-3 text-primary-500" />
            Color de Marca
          </label>
          <span className="font-mono text-[10px] font-semibold text-surface-500 dark:text-slate-400">
            {options.accentColor.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2 mb-1">
          {BRAND_COLOR_PRESETS.map((p) => {
            const isSelected = options.accentColor.toLowerCase() === p.hex.toLowerCase();
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => updateOption("accentColor", p.hex)}
                title={p.label}
                className={`w-5 h-5 rounded-full flex items-center justify-center transition-all cursor-pointer ${
                  isSelected
                    ? "ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-surface-900 scale-110"
                    : "opacity-80 hover:opacity-100 hover:scale-105"
                }`}
                style={{ backgroundColor: p.hex }}
              >
                {isSelected && <Check className="w-2.5 h-2.5 text-white drop-shadow-sm" />}
              </button>
            );
          })}

          <label
            title="Color personalizado (Selector HEX)"
            className="w-5 h-5 rounded-full border border-dashed border-surface-400 dark:border-surface-600 flex items-center justify-center cursor-pointer hover:border-primary-500 relative overflow-hidden shrink-0"
          >
            <input
              type="color"
              value={options.accentColor}
              onChange={(e) => updateOption("accentColor", e.target.value)}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: options.accentColor }} />
          </label>
        </div>

        <div className="text-[9.5px] text-surface-500 dark:text-slate-400 font-medium truncate">
          {BRAND_COLOR_PRESETS.find((p) => p.hex.toLowerCase() === options.accentColor.toLowerCase())
            ?.label || "Color Personalizado"}
        </div>
      </div>

      <div>
        <label className="flex items-center justify-between p-1 px-2 rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/5 hover:bg-surface-100 dark:hover:bg-white/10 transition cursor-pointer select-none mb-1">
          <span className="text-[10.5px] font-semibold text-surface-700 dark:text-slate-300 flex items-center gap-1">
            <Calendar className="w-3 h-3 text-primary-500" />
            Mostrar Vigencia / Fecha
          </span>
          <input
            type="checkbox"
            checked={options.showValidity || false}
            onChange={(e) => updateOption("showValidity", e.target.checked)}
            className="w-3 h-3 rounded text-primary-500 focus:ring-primary-500 accent-emerald-500 cursor-pointer"
          />
        </label>

        {options.showValidity && (
          <input
            type="text"
            value={options.validityText || ""}
            onChange={(e) => updateOption("validityText", e.target.value)}
            placeholder="Ej: 2026 - 2027 o Válido 1 año"
            className="w-full px-2 py-1 text-[11px] rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/10 text-surface-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-primary-500"
          />
        )}
      </div>

      <div className="pt-1 border-t border-surface-100 dark:border-white/10">
        <label className="flex items-center justify-between p-1 px-2 rounded-lg bg-primary-50/50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 hover:bg-primary-100/50 dark:hover:bg-primary-500/15 transition cursor-pointer select-none mb-1">
          <span className="text-[10.5px] font-bold text-primary-800 dark:text-primary-300 flex items-center gap-1">
            <Layers className="w-3 h-3 text-primary-500" />
            Incluir Reverso (Doble Cara)
          </span>
          <input
            type="checkbox"
            checked={options.includeBackside || false}
            onChange={(e) => {
              const checked = e.target.checked;
              updateOption("includeBackside", checked);
              setPreviewFace(checked ? "all" : "front");
            }}
            className="w-3.5 h-3.5 rounded text-primary-500 focus:ring-primary-500 accent-emerald-500 cursor-pointer"
          />
        </label>

        {options.includeBackside && (
          <div className="space-y-1.5 mt-1.5 p-2 rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/10 animate-fade-in">
            <div>
              <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                Texto de Políticas
              </label>
              <textarea
                rows={2}
                value={options.backsidePolicyText || ""}
                onChange={(e) => updateOption("backsidePolicyText", e.target.value)}
                placeholder="Políticas de uso..."
                className="w-full px-2 py-1 text-[10px] rounded bg-white dark:bg-black/20 border border-surface-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500 resize-none"
              />
            </div>
            <div>
              <label className="text-[9px] font-bold uppercase text-slate-500 block mb-0.5">
                En caso de extravío
              </label>
              <input
                type="text"
                value={options.backsideContactText || ""}
                onChange={(e) => updateOption("backsideContactText", e.target.value)}
                placeholder="Devolver en recepción..."
                className="w-full px-2 py-1 text-[10px] rounded bg-white dark:bg-black/20 border border-surface-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-primary-500"
              />
            </div>

            {format === "a4" && (
              <div className="pt-2 border-t border-surface-200/60 dark:border-white/10">
                <label className="text-[9px] font-bold uppercase text-slate-500 block mb-1">
                  Disposición en hoja A4
                </label>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBacksideLayout("same-sheet")}
                    className={`p-1.5 px-2 rounded-lg border text-left transition cursor-pointer ${
                      backsideLayout === "same-sheet"
                        ? "border-primary-500 bg-primary-50/60 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                        : "border-surface-200 dark:border-white/10 hover:bg-surface-100 dark:hover:bg-white/5 text-surface-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="font-bold text-[10px] leading-tight">Misma Hoja A4</div>
                    <div className="text-[8px] opacity-75 mt-0.5">
                      Frente y reverso juntos (1 hoja)
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setBacksideLayout("separate-sheets")}
                    className={`p-1.5 px-2 rounded-lg border text-left transition cursor-pointer ${
                      backsideLayout === "separate-sheets"
                        ? "border-primary-500 bg-primary-50/60 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                        : "border-surface-200 dark:border-white/10 hover:bg-surface-100 dark:hover:bg-white/5 text-surface-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="font-bold text-[10px] leading-tight">Hojas Separadas</div>
                    <div className="text-[8px] opacity-75 mt-0.5">Dúplex (2 hojas)</div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 mb-1 block">
          Datos Visibles
        </label>
        <div className="grid grid-cols-2 gap-1 text-[10px]">
          {VISIBLE_FIELD_TOGGLES.map(({ key, label }) => {
            const isChecked = Boolean(options[key]);
            return (
              <label
                key={key}
                className="flex items-center justify-between p-1 px-2 rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/5 hover:bg-surface-100 dark:hover:bg-white/10 transition cursor-pointer select-none"
              >
                <span className="text-surface-700 dark:text-slate-300 font-medium truncate mr-1">
                  {label}
                </span>
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={(e) => updateOption(key, e.target.checked as never)}
                  className="w-3 h-3 rounded text-primary-500 focus:ring-primary-500 accent-emerald-500 cursor-pointer shrink-0"
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-[9.5px] leading-snug flex items-start gap-1.5">
        <Info className="w-3 h-3 shrink-0 mt-0.5" />
        <span>
          <strong>Tip:</strong> Activa <em>&ldquo;Gráficos en segundo plano&rdquo;</em> para
          colores exactos.
        </span>
      </div>
    </div>
  );
}
