"use client";

import React from "react";
import { Shield, MapPin, FileText, QrCode as QrIcon, AlertCircle, Phone, Clock, Lock } from "lucide-react";

export type BadgeOrientation = "vertical" | "horizontal";

export const BRAND_COLOR_PRESETS = [
  { key: "brand-green", label: "Verde Hotel Italia", hex: "#00A650" },
  { key: "brand-red", label: "Rojo Hotel Italia", hex: "#ED1B24" },
  { key: "brand-slate", label: "Grafito Carbón", hex: "#1F1F1F" },
  { key: "brand-gold", label: "Dorado Hotelero", hex: "#C59B27" },
  { key: "brand-navy", label: "Azul Marino", hex: "#0A2540" },
] as const;

export interface CredentialBadgeOptions {
  orientation: BadgeOrientation;
  showAvatar: boolean;
  showLogo: boolean;
  showDocumentId: boolean;
  showLocation: boolean;
  showRole: boolean;
  showToken: boolean;
  showCropMarks: boolean;
  accentColor: string; // Hexadecimal exacto (ej. #00A650)
  organizationName?: string;
  logoUrl?: string | null;
  // Opciones avanzadas
  includeBackside?: boolean;
  showValidity?: boolean;
  validityText?: string;
  backsidePolicyText?: string;
  backsideContactText?: string;
}

export interface CredentialUser {
  id: string;
  firstName: string;
  lastName: string;
  email?: string;
  role: string;
  documentId?: string | null;
  qrToken: string;
  signedQrPayload?: string | null;
  locationName?: string | null;
}

interface CredentialBadgeProps {
  user: CredentialUser;
  qrDataUrl?: string;
  options: CredentialBadgeOptions;
  scale?: number;
  className?: string;
  isPrintMode?: boolean;
  isBackside?: boolean; // Renderizar la cara posterior (reverso)
}

export function CredentialBadge({
  user,
  qrDataUrl,
  options,
  scale = 1,
  className = "",
  isPrintMode = false,
  isBackside = false,
}: CredentialBadgeProps) {
  const accentHex = options.accentColor || "#00A650";
  const initials = `${user.firstName?.[0] || ""}${user.lastName?.[0] || ""}`.toUpperCase();
  const orgName = options.organizationName || user.locationName || "Hotel Italia";
  const logoSrc = options.logoUrl || "/brand/logo.png";

  const isVertical = options.orientation === "vertical";
  const fullName = `${user.firstName || ""} ${user.lastName || ""}`.trim();
  const vertNameSizeClass =
    fullName.length > 25
      ? "text-[9.5px] leading-tight"
      : fullName.length > 18
      ? "text-[10.5px] leading-snug"
      : "text-xs leading-snug";

  const horizNameSizeClass =
    fullName.length > 25
      ? "text-[9px] leading-tight"
      : fullName.length > 18
      ? "text-[10px] leading-snug"
      : "text-[11px] leading-snug";

  // Dimensiones físicas milimétricas para impresión física vs pantalla
  const printStyle = isPrintMode
    ? isVertical
      ? { width: "70mm", minHeight: "105mm", maxHeight: "108mm" }
      : { width: "85.6mm", minHeight: "54mm", maxHeight: "56mm" }
    : undefined;

  const sizeClasses = isPrintMode
    ? ""
    : isVertical
    ? "w-[195px] min-h-[290px]"
    : "w-full max-w-[270px] min-h-[165px]";

  const defaultPolicyText =
    options.backsidePolicyText ||
    "Esta credencial es propiedad de la empresa. Su uso es personal e intransferible. Debe portarse en lugar visible.";
  const defaultContactText =
    options.backsideContactText ||
    "En caso de extravío, devolver en Recepción o comunicarse con el dpto. de Recursos Humanos.";

  return (
    <div
      style={scale !== 1 ? { transform: `scale(${scale})`, transformOrigin: "top center" } : undefined}
      className={`credential-badge-container select-none print:transform-none w-full flex justify-center ${className}`}
    >
      <div
        className={`credential-card relative bg-white text-slate-900 overflow-hidden font-sans ${sizeClasses} ${
          options.showCropMarks
            ? "border border-dashed border-slate-300 shadow-sm print:border-slate-400"
            : "border border-slate-200 shadow-md print:border-slate-300"
        } rounded-xl flex flex-col justify-between`}
        style={printStyle}
      >
        {/* Guías de corte visuales en las 4 esquinas si está activo */}
        {options.showCropMarks && (
          <>
            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-slate-400 pointer-events-none z-20" />
            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-slate-400 pointer-events-none z-20" />
            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-slate-400 pointer-events-none z-20" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-slate-400 pointer-events-none z-20" />
          </>
        )}

        {/* ============================================================== */}
        {/* RENDERIZADO DEL REVERSO (CARA TRASERA / BACKSIDE)             */}
        {/* ============================================================== */}
        {isBackside ? (
          isVertical ? (
            // Reverso Vertical
            <>
              {/* Cabecera Reverso */}
              <div className="pt-2 px-2.5 pb-1 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 flex flex-col items-center shrink-0">
                <div className="w-7 h-1.5 rounded-full border border-slate-300 bg-slate-100 mb-1 flex items-center justify-center">
                  <div className="w-3.5 h-0.5 rounded-full bg-slate-300" />
                </div>
                <div className="flex items-center gap-1.5 text-[8.5px] font-black tracking-wider uppercase text-slate-700">
                  {options.showLogo && logoSrc && (
                    <img src={logoSrc} alt="" className="w-3.5 h-3.5 object-contain rounded shrink-0" />
                  )}
                  <span>{orgName} · REVERSO</span>
                </div>
              </div>
              <div className="h-1 w-full shrink-0" style={{ backgroundColor: accentHex }} />

              {/* Contenido Reverso */}
              <div className="p-2.5 flex-1 flex flex-col justify-between text-left text-slate-700">
                <div className="space-y-2">
                  {/* Políticas */}
                  <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1 text-[7.5px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                      <Lock className="w-2.5 h-2.5 text-slate-400" />
                      Políticas de Uso
                    </div>
                    <p className="text-[6.5px] text-slate-500 leading-snug">
                      {defaultPolicyText}
                    </p>
                  </div>

                  {/* Contacto / Extravío */}
                  <div className="p-1.5 rounded bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1 text-[7.5px] font-bold uppercase tracking-wider text-slate-600 mb-0.5">
                      <Phone className="w-2.5 h-2.5 text-slate-400" />
                      En caso de extravío
                    </div>
                    <p className="text-[6.5px] text-slate-500 leading-snug">
                      {defaultContactText}
                    </p>
                  </div>

                  {/* Vigencia */}
                  {options.showValidity && options.validityText && (
                    <div className="flex items-center justify-between text-[7px] font-semibold px-1 text-slate-600">
                      <span className="flex items-center gap-0.5">
                        <Clock className="w-2.5 h-2.5 text-slate-400" />
                        Vigencia:
                      </span>
                      <span className="font-bold text-slate-800">{options.validityText}</span>
                    </div>
                  )}
                </div>

                {/* Sello de seguridad */}
                <div className="pt-1.5 border-t border-slate-100 text-center text-[6px] text-slate-400">
                  <p className="font-mono">TITULAR: {user.firstName.toUpperCase()} {user.lastName.toUpperCase()}</p>
                  <p className="text-[5.5px] mt-0.5">Pase oficial emitido por Presenxa ID</p>
                </div>
              </div>

              {/* Pie Reverso */}
              <div className="py-0.5 px-2 bg-slate-50 border-t border-slate-100 text-center shrink-0 text-[6px] text-slate-400 font-medium">
                Documento de Identificación Laboral
              </div>
            </>
          ) : (
            // Reverso Horizontal
            <>
              <div className="pt-1.5 px-3 pb-1 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-1 text-[8px] font-black tracking-wider uppercase text-slate-700">
                  {options.showLogo && logoSrc && (
                    <img src={logoSrc} alt="" className="w-3 h-3 object-contain rounded shrink-0" />
                  )}
                  <span>{orgName} · INFORMACIÓN INSTITUCIONAL</span>
                </div>
                <span className="text-[6.5px] font-bold text-slate-400 uppercase">REVERSO</span>
              </div>
              <div className="h-1 w-full shrink-0" style={{ backgroundColor: accentHex }} />

              <div className="p-2.5 flex-1 flex items-start justify-between gap-2.5 text-left text-slate-700">
                {/* Columna Izquierda: Políticas */}
                <div className="flex-1 space-y-1.5">
                  <div className="p-1 rounded bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1 text-[7px] font-bold uppercase text-slate-600 mb-0.5">
                      <Lock className="w-2 h-2 text-slate-400" />
                      Normativa
                    </div>
                    <p className="text-[6px] text-slate-500 leading-snug line-clamp-3">
                      {defaultPolicyText}
                    </p>
                  </div>
                  {options.showValidity && options.validityText && (
                    <p className="text-[6.5px] font-semibold text-slate-600">
                      Válido hasta: <span className="font-bold text-slate-800">{options.validityText}</span>
                    </p>
                  )}
                </div>

                {/* Columna Derecha: Extravío y Firma */}
                <div className="w-28 shrink-0 flex flex-col justify-between h-full">
                  <div className="p-1 rounded bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1 text-[7px] font-bold uppercase text-slate-600 mb-0.5">
                      <Phone className="w-2 h-2 text-slate-400" />
                      Contacto
                    </div>
                    <p className="text-[6px] text-slate-500 leading-snug line-clamp-3">
                      {defaultContactText}
                    </p>
                  </div>
                  <div className="text-right text-[6px] text-slate-400 pt-1 border-t border-slate-100">
                    ID: {user.qrToken}
                  </div>
                </div>
              </div>

              <div className="py-0.5 px-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[6px] text-slate-400 shrink-0">
                <span>{user.firstName} {user.lastName} ({user.role})</span>
                <span>Presenxa</span>
              </div>
            </>
          )
        ) : isVertical ? (
          // ==============================================================
          // RENDERIZADO DEL FRENTE (CARA PRINCIPAL VERTICAL)
          // ==============================================================
          <>
            {/* Cabecera con guía de ranura para lanyard */}
            <div className="relative pt-2 px-2.5 pb-1.5 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 flex flex-col items-center shrink-0">
              {/* Ranura troquelada simulada */}
              <div className="w-7 h-1.5 rounded-full border border-slate-300 bg-slate-100 mb-1 flex items-center justify-center">
                <div className="w-3.5 h-0.5 rounded-full bg-slate-300" />
              </div>

              {/* Branding institucional con logo oficial y nombre */}
              <div className="flex items-center gap-1.5 text-[9px] font-black tracking-wider uppercase text-slate-700">
                {options.showLogo && logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={orgName}
                    className="w-3.5 h-3.5 object-contain rounded shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: accentHex }}
                  />
                )}
                <span className="truncate max-w-[130px]">{orgName}</span>
                <span className="text-slate-400 font-normal">·</span>
                <span className="text-[8px] font-semibold text-slate-500">PASE</span>
              </div>
            </div>

            {/* Banda de acento visual con color corporativo */}
            <div
              className="h-1 w-full shrink-0"
              style={{ backgroundColor: accentHex }}
            />

            {/* Contenido principal: Foto/Avatar + Nombres + Datos */}
            <div className="px-2.5 pt-1.5 pb-1 flex flex-col items-center text-center flex-1 justify-center">
              {options.showAvatar && (
                <div className="relative mb-1">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border-2 border-white shadow-sm flex items-center justify-center text-slate-700 font-extrabold text-xs ring-1 ring-slate-200">
                    {initials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-white shadow flex items-center justify-center">
                    <Shield
                      className="w-2 h-2"
                      style={{ color: accentHex }}
                    />
                  </div>
                </div>
              )}

              {/* Nombres y Apellidos */}
              <h3 className={`font-extrabold text-slate-900 ${vertNameSizeClass} break-words px-1 max-w-full text-center`}>
                {fullName}
              </h3>

              {/* Rol y badges */}
              <div className="mt-0.5 flex flex-wrap items-center justify-center gap-1">
                {options.showRole && (
                  <span
                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[7.5px] font-bold uppercase tracking-wider border"
                    style={{
                      borderColor: `${accentHex}40`,
                      color: accentHex === "#1F1F1F" ? "#334155" : accentHex,
                      backgroundColor: `${accentHex}12`,
                    }}
                  >
                    {user.role}
                  </span>
                )}
                {options.showLocation && user.locationName && (
                  <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7.5px] font-medium bg-slate-100 text-slate-600">
                    <MapPin className="w-2 h-2" />
                    <span className="truncate max-w-[75px]">{user.locationName}</span>
                  </span>
                )}
              </div>

              {/* Documento de Identidad y Vigencia */}
              <div className="mt-0.5 flex flex-wrap items-center justify-center gap-x-2 text-[8px] font-medium text-slate-500">
                {options.showDocumentId && user.documentId && (
                  <span className="flex items-center gap-0.5">
                    <FileText className="w-2 h-2 text-slate-400" />
                    DOC: {user.documentId}
                  </span>
                )}
                {options.showValidity && options.validityText && (
                  <span className="flex items-center gap-0.5 text-slate-600 font-semibold">
                    <Clock className="w-2 h-2 text-slate-400" />
                    {options.validityText}
                  </span>
                )}
              </div>

              {/* Contenedor del Código QR */}
              <div className="mt-1.5 mb-0.5 p-1 rounded-lg bg-white border border-slate-200 shadow-inner flex flex-col items-center">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR de ${user.firstName}`}
                    className="w-[84px] h-[84px] rounded block"
                  />
                ) : (
                  <div className="w-[84px] h-[84px] bg-slate-50 rounded flex items-center justify-center text-slate-400 text-[9px] animate-pulse">
                    <QrIcon className="w-5 h-5 text-slate-300" />
                  </div>
                )}
                <span className="text-[6.5px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  Acceso Kiosco
                </span>
              </div>

              {/* Token textual */}
              {options.showToken && (
                <div className="text-[7px] font-mono text-slate-400 truncate max-w-[160px]">
                  ID: {user.qrToken}
                </div>
              )}
            </div>

            {/* Pie de credencial */}
            <div className="py-1 px-2 bg-slate-50 border-t border-slate-100 text-center shrink-0">
              <p className="text-[6.5px] text-slate-400 font-medium tracking-tight">
                Pase intransferible · Presentar en kiosco
              </p>
            </div>
          </>
        ) : (
          // ==============================================================
          // RENDERIZADO DEL FRENTE (CARA PRINCIPAL HORIZONTAL)
          // ==============================================================
          <>
            {/* Cabecera con logo y nombre de hotel */}
            <div className="pt-1.5 px-3 pb-1 bg-gradient-to-b from-slate-50 to-white border-b border-slate-100 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-1.5 text-[8.5px] font-black tracking-wider uppercase text-slate-700">
                {options.showLogo && logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={orgName}
                    className="w-3.5 h-3.5 object-contain rounded shrink-0"
                    onError={(e) => {
                      (e.target as HTMLElement).style.display = "none";
                    }}
                  />
                ) : (
                  <span
                    className="w-1.5 h-1.5 rounded-full shrink-0"
                    style={{ backgroundColor: accentHex }}
                  />
                )}
                <span className="truncate max-w-[130px]">{orgName}</span>
              </div>
              <span className="text-[7px] font-bold text-slate-400 uppercase tracking-widest">
                PASE OFICIAL
              </span>
            </div>

            {/* Barra superior de acento con color corporativo */}
            <div
              className="h-1 w-full shrink-0"
              style={{ backgroundColor: accentHex }}
            />

            {/* Contenido principal: Avatar + Datos (Izquierda/Centro) y QR (Derecha) */}
            <div className="px-2.5 py-1.5 flex items-center justify-between gap-2 flex-1 min-h-0">
              {/* Avatar (si está activo) */}
              {options.showAvatar && (
                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 border border-white shadow-sm flex items-center justify-center text-slate-700 font-extrabold text-xs ring-1 ring-slate-200">
                    {initials}
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-white shadow flex items-center justify-center">
                    <Shield className="w-1.5 h-1.5" style={{ color: accentHex }} />
                  </div>
                </div>
              )}

              {/* Datos del colaborador */}
              <div className="flex-1 flex flex-col justify-center min-w-0 pr-0.5">
                <h3 className={`font-extrabold text-slate-900 ${horizNameSizeClass} break-words leading-tight max-w-full`}>
                  {fullName}
                </h3>

                <div className="mt-0.5 flex flex-wrap items-center gap-1">
                  {options.showRole && (
                    <span
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-[7px] font-bold uppercase tracking-wider border"
                      style={{
                        borderColor: `${accentHex}40`,
                        color: accentHex === "#1F1F1F" ? "#334155" : accentHex,
                        backgroundColor: `${accentHex}12`,
                      }}
                    >
                      {user.role}
                    </span>
                  )}
                  {options.showLocation && user.locationName && (
                    <span className="inline-flex items-center gap-0.5 px-1 py-0.5 rounded text-[7px] font-medium bg-slate-100 text-slate-600">
                      <MapPin className="w-2 h-2" />
                      <span className="truncate max-w-[65px]">{user.locationName}</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 mt-0.5 text-[7.5px] text-slate-500 font-medium">
                  {options.showDocumentId && user.documentId && (
                    <p>
                      DOC: <span className="font-semibold text-slate-700">{user.documentId}</span>
                    </p>
                  )}
                  {options.showValidity && options.validityText && (
                    <p className="font-semibold text-slate-600">
                      Válido: <span className="font-bold text-slate-800">{options.validityText}</span>
                    </p>
                  )}
                </div>

                {options.showToken && (
                  <p className="text-[6.5px] font-mono text-slate-400 truncate mt-0.5 max-w-[95px]">
                    ID: {user.qrToken}
                  </p>
                )}
              </div>

              {/* Columna Derecha: Código QR */}
              <div className="flex flex-col items-center justify-center p-1 bg-slate-50 rounded-lg border border-slate-200 shrink-0">
                {qrDataUrl ? (
                  <img
                    src={qrDataUrl}
                    alt={`QR de ${user.firstName}`}
                    className="w-[68px] h-[68px] rounded block"
                  />
                ) : (
                  <div className="w-[68px] h-[68px] bg-white rounded flex items-center justify-center text-slate-400 text-[8px] animate-pulse">
                    <QrIcon className="w-4 h-4 text-slate-300" />
                  </div>
                )}
                <span className="text-[6px] font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                  Escanear
                </span>
              </div>
            </div>

            {/* Pie de credencial */}
            <div className="py-0.5 px-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[6px] text-slate-400 shrink-0">
              <span>Credencial Oficial</span>
              <span>Presenxa</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
