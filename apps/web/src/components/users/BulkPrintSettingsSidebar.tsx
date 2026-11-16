import React, { useEffect, useRef } from "react";
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

function parseHexRgb(hex: string): [number, number, number] {
  const clean = (hex || "#00A650").replace("#", "").trim();
  if (clean.length === 3) {
    return [
      Number.parseInt(clean[0] + clean[0], 16) || 0,
      Number.parseInt(clean[1] + clean[1], 16) || 0,
      Number.parseInt(clean[2] + clean[2], 16) || 0,
    ];
  }
  return [
    Number.parseInt(clean.slice(0, 2), 16) || 0,
    Number.parseInt(clean.slice(2, 4), 16) || 0,
    Number.parseInt(clean.slice(4, 6), 16) || 0,
  ];
}

function getRelativeLuminance(hex: string): number {
  const [r, g, b] = parseHexRgb(hex).map((v) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Returns "#0F172A" (dark slate) on bright/light accents (like gold or pastel hexes) or "#FFFFFF" on rich/dark brand accents.
 */
export function getReadableTextColor(hex: string): "#FFFFFF" | "#0F172A" {
  const lum = getRelativeLuminance(hex);
  return lum > 0.32 ? "#0F172A" : "#FFFFFF";
}

interface BulkPrintHeaderProps {
  titleId: string;
  descriptionId: string;
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
  titleId,
  descriptionId,
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
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUsersDropdownOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(event.target as Node)
      ) {
        setIsUsersDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isUsersDropdownOpen, setIsUsersDropdownOpen]);

  const isVeryDarkAccent = getRelativeLuminance(accentColor) < 0.06;
  const printButtonTextColor = getReadableTextColor(accentColor);
  const noActiveUsers = activeUsersCount === 0;

  return (
    <div className="px-4 sm:px-5 py-2.5 sm:py-3 border-b border-surface-200 dark:border-surface-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-white dark:bg-surface-950 shrink-0 z-20">
      <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
        <div
          className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-inner shrink-0 transition-colors ${
            isVeryDarkAccent ? "dark:!text-slate-200 dark:!border-slate-700 dark:!bg-slate-800/70" : ""
          }`}
          style={{
            backgroundColor: `${accentColor}18`,
            borderColor: `${accentColor}35`,
            color: isVeryDarkAccent ? "#334155" : accentColor,
          }}
        >
          <Printer className="w-4 h-4" />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h2
              id={titleId}
              className="text-sm sm:text-base font-black text-surface-900 dark:text-white leading-tight"
            >
              {users.length === 1 ? "Impresión de Credencial" : "Estudio de Impresión de Credenciales"}
            </h2>

            {users.length > 1 ? (
              <div ref={dropdownContainerRef} className="relative">
                <button
                  type="button"
                  aria-expanded={isUsersDropdownOpen}
                  aria-haspopup="true"
                  aria-controls="print-studio-users-dropdown"
                  onClick={() => setIsUsersDropdownOpen(!isUsersDropdownOpen)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border cursor-pointer transition-all hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                    isVeryDarkAccent
                      ? "dark:!text-slate-200 dark:!border-slate-700 dark:!bg-slate-800/80"
                      : ""
                  }`}
                  style={{
                    backgroundColor: `${accentColor}15`,
                    borderColor: `${accentColor}35`,
                    color: isVeryDarkAccent ? "#334155" : accentColor,
                  }}
                >
                  <Users className="w-3 h-3" />
                  <span>
                    {activeUsersCount} de {users.length} incluidos
                  </span>
                  <ChevronDown className="w-3 h-3 opacity-75" />
                </button>

                {isUsersDropdownOpen && (
                  <div
                    id="print-studio-users-dropdown"
                    role="region"
                    aria-label="Seleccionar colaboradores incluidos en la impresión"
                    className="absolute top-full left-0 mt-1.5 w-64 bg-white dark:bg-[#0f172a] rounded-xl shadow-xl border border-surface-200 dark:border-white/10 p-2.5 z-50 animate-scale-up text-xs"
                  >
                    <div className="flex items-center justify-between pb-1.5 mb-1.5 border-b border-surface-100 dark:border-white/10 text-[11px] font-bold text-surface-500 dark:text-slate-400 uppercase">
                      <span>Incluir en esta impresión</span>
                      <button
                        type="button"
                        onClick={onClearExcluded}
                        className="text-primary-600 dark:text-primary-400 hover:underline cursor-pointer rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 px-1"
                      >
                        Marcar todos
                      </button>
                    </div>
                    <div className="max-h-52 overflow-y-auto space-y-1">
                      {users.map((u) => {
                        const isIncluded = !excludedUserIds.includes(u.id);
                        return (
                          <label
                            key={`exclude-${u.id}`}
                            className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-surface-50 dark:hover:bg-white/5 cursor-pointer text-xs"
                          >
                            <span className="truncate mr-2 font-medium text-surface-800 dark:text-slate-200">
                              {u.firstName} {u.lastName}
                            </span>
                            <input
                              type="checkbox"
                              checked={isIncluded}
                              onChange={() => onToggleExcludeUser(u.id)}
                              className="w-4 h-4 rounded text-primary-500 accent-emerald-500 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
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
                className={`flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wider border shrink-0 ${
                  isVeryDarkAccent
                    ? "dark:!text-slate-200 dark:!border-slate-700 dark:!bg-slate-800/80"
                    : ""
                }`}
                style={{
                  backgroundColor: `${accentColor}15`,
                  borderColor: `${accentColor}35`,
                  color: isVeryDarkAccent ? "#334155" : accentColor,
                }}
              >
                <Users className="w-3 h-3" />
                <span>
                  {users[0]?.firstName} {users[0]?.lastName}
                </span>
              </div>
            )}
          </div>
          <p id={descriptionId} className="text-[11px] text-surface-500 dark:text-slate-400">
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
          disabled={isDownloading || isGeneratingQrs || noActiveUsers}
          title="Descargar imágenes PNG en alta resolución para celular o WhatsApp"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-surface-200 dark:border-white/10 bg-surface-100 hover:bg-surface-200 dark:bg-white/5 dark:hover:bg-white/10 text-surface-700 dark:text-slate-200 text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
        >
          <Download className="w-3.5 h-3.5 text-primary-500" />
          <span>{isDownloading ? "Descargando..." : "Descargar PNG"}</span>
        </button>

        <button
          type="button"
          onClick={onPrint}
          disabled={isGeneratingQrs || noActiveUsers}
          className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-1"
          style={{
            backgroundColor: accentColor || "#00A650",
            color: printButtonTextColor,
            boxShadow: `0 4px 14px 0 ${accentColor}40`,
          }}
        >
          <Printer className="w-3.5 h-3.5" />
          <span>
            Imprimir ({totalPrintSheets} {totalPrintSheets === 1 ? "hoja" : "hojas"})
          </span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="w-9 h-9 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center text-surface-400 hover:text-surface-700 dark:hover:text-white hover:bg-surface-100 dark:hover:bg-white/10 transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
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
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-primary-500" />
          Formato de Salida
        </h3>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            aria-pressed={format === "a4"}
            onClick={() => setFormat("a4")}
            className={`p-2 px-2.5 rounded-lg border text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
              format === "a4"
                ? "border-primary-500 bg-primary-50/50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                : "border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/5 text-surface-700 dark:text-slate-300"
            }`}
          >
            <div className="font-bold text-xs">Hoja A4</div>
            <div className="text-[11px] opacity-80">
              {getA4CapacityLabel(usersCount, options.orientation)}
            </div>
          </button>

          <button
            type="button"
            aria-pressed={format === "pvc"}
            onClick={() => setFormat("pvc")}
            className={`p-2 px-2.5 rounded-lg border text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
              format === "pvc"
                ? "border-primary-500 bg-primary-50/50 dark:bg-primary-500/10 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                : "border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/5 text-surface-700 dark:text-slate-300"
            }`}
          >
            <div className="font-bold text-xs">Tarjeta PVC</div>
            <div className="text-[11px] opacity-80">1 por página</div>
          </button>
        </div>
      </div>

      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-primary-500" />
          Orientación
        </h3>
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
              aria-pressed={options.orientation === item.value}
              onClick={() => updateOption("orientation", item.value)}
              className={`py-1.5 px-2 rounded-lg border text-center text-[11px] font-semibold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
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
        <label
          htmlFor="credential-org-name"
          className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 mb-1.5 flex items-center gap-1.5"
        >
          <Building className="w-3.5 h-3.5 text-primary-500" />
          Cabecera / Empresa
        </label>
        <input
          id="credential-org-name"
          type="text"
          value={options.organizationName || ""}
          onChange={(e) => updateOption("organizationName", e.target.value)}
          placeholder="Ej: HOTEL ITALIA"
          className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/10 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      <div>
        <div className="flex items-center justify-between mb-1.5">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 flex items-center gap-1.5">
            <Palette className="w-3.5 h-3.5 text-primary-500" />
            Color de Marca
          </h3>
          <span className="font-mono text-[11px] font-semibold text-surface-500 dark:text-slate-400">
            {options.accentColor.toUpperCase()}
          </span>
        </div>

        <div className="flex items-center gap-2.5 mb-1.5 flex-wrap">
          {BRAND_COLOR_PRESETS.map((p) => {
            const isSelected = options.accentColor.toLowerCase() === p.hex.toLowerCase();
            const checkColor = getReadableTextColor(p.hex);
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => updateOption("accentColor", p.hex)}
                title={p.label}
                aria-label={`Color de marca: ${p.label}`}
                aria-pressed={isSelected}
                className={`w-7 h-7 sm:w-6 sm:h-6 rounded-full flex items-center justify-center transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-surface-900 ${
                  isSelected
                    ? "ring-2 ring-offset-2 ring-primary-500 dark:ring-offset-surface-900 scale-110"
                    : "opacity-85 hover:opacity-100 hover:scale-105"
                }`}
                style={{ backgroundColor: p.hex }}
              >
                {isSelected && (
                  <Check className="w-3.5 h-3.5 drop-shadow-xs" style={{ color: checkColor }} />
                )}
              </button>
            );
          })}

          <label
            title="Color personalizado (Selector HEX)"
            className="w-7 h-7 sm:w-6 sm:h-6 rounded-full border border-dashed border-surface-400 dark:border-surface-600 flex items-center justify-center cursor-pointer hover:border-primary-500 relative overflow-hidden shrink-0 focus-within:ring-2 focus-within:ring-primary-500 focus-within:ring-offset-2 dark:focus-within:ring-offset-surface-900"
          >
            <input
              type="color"
              aria-label="Seleccionar color de marca personalizado (HEX)"
              value={options.accentColor}
              onChange={(e) => updateOption("accentColor", e.target.value)}
              className="opacity-0 absolute inset-0 w-full h-full cursor-pointer"
            />
            <div
              className="w-4 h-4 sm:w-3.5 sm:h-3.5 rounded-full"
              style={{ backgroundColor: options.accentColor }}
            />
          </label>
        </div>

        <div className="text-[11px] text-surface-500 dark:text-slate-400 font-medium truncate">
          {BRAND_COLOR_PRESETS.find((p) => p.hex.toLowerCase() === options.accentColor.toLowerCase())
            ?.label || "Color Personalizado"}
        </div>
      </div>

      <div>
        <label className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/5 hover:bg-surface-100 dark:hover:bg-white/10 transition cursor-pointer select-none mb-1.5">
          <span className="text-[11px] font-semibold text-surface-700 dark:text-slate-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-primary-500" />
            Mostrar Vigencia / Fecha
          </span>
          <input
            type="checkbox"
            checked={options.showValidity || false}
            onChange={(e) => updateOption("showValidity", e.target.checked)}
            className="w-3.5 h-3.5 rounded text-primary-500 focus:ring-2 focus:ring-primary-500 accent-emerald-500 cursor-pointer"
          />
        </label>

        {options.showValidity && (
          <div>
            <label htmlFor="credential-validity-text" className="sr-only">
              Texto de vigencia o fecha
            </label>
            <input
              id="credential-validity-text"
              type="text"
              value={options.validityText || ""}
              onChange={(e) => updateOption("validityText", e.target.value)}
              placeholder="Ej: 2026 - 2027 o Válido 1 año"
              className="w-full px-2.5 py-1.5 text-xs rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/10 text-surface-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}
      </div>

      <div className="pt-1 border-t border-surface-100 dark:border-white/10">
        <label className="flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-primary-50/50 dark:bg-primary-500/10 border border-primary-200 dark:border-primary-500/20 hover:bg-primary-100/50 dark:hover:bg-primary-500/15 transition cursor-pointer select-none mb-1.5">
          <span className="text-[11px] font-bold text-primary-800 dark:text-primary-300 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-primary-500" />
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
            className="w-3.5 h-3.5 rounded text-primary-500 focus:ring-2 focus:ring-primary-500 accent-emerald-500 cursor-pointer"
          />
        </label>

        {options.includeBackside && (
          <div className="space-y-2 mt-1.5 p-2.5 rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/10 animate-fade-in">
            <div>
              <label
                htmlFor="credential-policy-text"
                className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1"
              >
                Texto de Políticas
              </label>
              <textarea
                id="credential-policy-text"
                rows={2}
                value={options.backsidePolicyText || ""}
                onChange={(e) => updateOption("backsidePolicyText", e.target.value)}
                placeholder="Políticas de uso..."
                className="w-full px-2.5 py-1.5 text-[11px] rounded-md bg-white dark:bg-black/20 border border-surface-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
              />
            </div>
            <div>
              <label
                htmlFor="credential-contact-text"
                className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1"
              >
                En caso de extravío
              </label>
              <input
                id="credential-contact-text"
                type="text"
                value={options.backsideContactText || ""}
                onChange={(e) => updateOption("backsideContactText", e.target.value)}
                placeholder="Devolver en recepción..."
                className="w-full px-2.5 py-1.5 text-[11px] rounded-md bg-white dark:bg-black/20 border border-surface-200 dark:border-white/10 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            {format === "a4" && (
              <div className="pt-2 border-t border-surface-200/60 dark:border-white/10">
                <h4 className="text-[11px] font-bold uppercase text-slate-600 dark:text-slate-400 block mb-1.5">
                  Disposición en hoja A4
                </h4>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    aria-pressed={backsideLayout === "same-sheet"}
                    onClick={() => setBacksideLayout("same-sheet")}
                    className={`p-2 px-2.5 rounded-lg border text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      backsideLayout === "same-sheet"
                        ? "border-primary-500 bg-primary-50/60 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                        : "border-surface-200 dark:border-white/10 hover:bg-surface-100 dark:hover:bg-white/5 text-surface-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="font-bold text-[11px] leading-tight">Misma Hoja A4</div>
                    <div className="text-[10.5px] opacity-80 mt-0.5 leading-tight">
                      Frente y reverso juntos
                    </div>
                  </button>
                  <button
                    type="button"
                    aria-pressed={backsideLayout === "separate-sheets"}
                    onClick={() => setBacksideLayout("separate-sheets")}
                    className={`p-2 px-2.5 rounded-lg border text-left transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
                      backsideLayout === "separate-sheets"
                        ? "border-primary-500 bg-primary-50/60 dark:bg-primary-500/15 text-primary-700 dark:text-primary-300 ring-1 ring-primary-500/30"
                        : "border-surface-200 dark:border-white/10 hover:bg-surface-100 dark:hover:bg-white/5 text-surface-700 dark:text-slate-300"
                    }`}
                  >
                    <div className="font-bold text-[11px] leading-tight">Hojas Separadas</div>
                    <div className="text-[10.5px] opacity-80 mt-0.5 leading-tight">
                      Dúplex (2 hojas)
                    </div>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <div>
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-surface-500 dark:text-slate-400 mb-1.5 block">
          Datos Visibles
        </h3>
        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
          {VISIBLE_FIELD_TOGGLES.map(({ key, label }) => {
            const isCropMarksOnPvc = key === "showCropMarks" && format === "pvc";
            const isChecked = isCropMarksOnPvc ? false : Boolean(options[key]);
            return (
              <label
                key={key}
                title={
                  isCropMarksOnPvc
                    ? "Las tarjetas PVC se imprimen a sangre completa sin guías de corte"
                    : undefined
                }
                className={`flex items-center justify-between py-1.5 px-2.5 rounded-lg bg-surface-50 dark:bg-white/5 border border-surface-200 dark:border-white/5 transition select-none ${
                  isCropMarksOnPvc
                    ? "opacity-50 cursor-not-allowed"
                    : "hover:bg-surface-100 dark:hover:bg-white/10 cursor-pointer"
                }`}
              >
                <span className="text-surface-700 dark:text-slate-300 font-medium truncate mr-1.5">
                  {label}
                </span>
                <input
                  type="checkbox"
                  disabled={isCropMarksOnPvc}
                  checked={isChecked}
                  onChange={(e) => updateOption(key, e.target.checked as never)}
                  className="w-3.5 h-3.5 rounded text-primary-500 focus:ring-2 focus:ring-primary-500 accent-emerald-500 cursor-pointer disabled:cursor-not-allowed shrink-0"
                />
              </label>
            );
          })}
        </div>
      </div>

      <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] leading-snug flex items-start gap-2">
        <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
        <span>
          <strong>Tip:</strong> Activa <em>&ldquo;Gráficos en segundo plano&rdquo;</em> para
          colores exactos.
        </span>
      </div>
    </div>
  );
}
