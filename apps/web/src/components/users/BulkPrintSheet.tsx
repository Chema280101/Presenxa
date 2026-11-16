import React from "react";
import { Eye, Layers, RotateCcw, Sparkles, Users, ZoomIn, ZoomOut } from "lucide-react";
import {
  CredentialBadge,
  type CredentialBadgeOptions,
  type CredentialUser,
} from "./CredentialBadge";

export type SheetFormat = "a4" | "pvc";
export type BacksideLayout = "same-sheet" | "separate-sheets";
export type PreviewFace = "all" | "front" | "back";

export interface PreviewSheetDescriptor {
  key: string;
  pageUsers: CredentialUser[];
  mode: "same-sheet" | "single-side";
  isBackside: boolean;
  sheetNumber: number;
  totalSheets: number;
  badgeText: string;
}

export function computeItemsPerPage(
  format: SheetFormat,
  isSameSheet: boolean,
  orientation: "vertical" | "horizontal"
): number {
  if (format === "pvc") return 1;
  if (isSameSheet) return 2;
  return orientation === "vertical" ? 4 : 6;
}

export function buildPreviewSheets(
  pages: CredentialUser[][],
  includeBackside: boolean,
  isSameSheet: boolean,
  previewFace: PreviewFace,
  format: SheetFormat
): PreviewSheetDescriptor[] {
  const formatLabel = format === "a4" ? "A4" : "PVC";

  if (!includeBackside) {
    return pages.map((pageUsers, pageIndex) => ({
      key: `preview-front-${pageIndex}`,
      pageUsers,
      mode: "single-side",
      isBackside: false,
      sheetNumber: pageIndex + 1,
      totalSheets: pages.length,
      badgeText: `Frente de Hoja (${formatLabel})`,
    }));
  }

  if (isSameSheet) {
    return pages.map((pageUsers, pageIndex) => ({
      key: `preview-samesheet-${pageIndex}`,
      pageUsers,
      mode: "same-sheet",
      isBackside: false,
      sheetNumber: pageIndex + 1,
      totalSheets: pages.length,
      badgeText: "Frente y Reverso en la misma hoja (A4)",
    }));
  }

  const sheets: PreviewSheetDescriptor[] = [];
  pages.forEach((pageUsers, pageIndex) => {
    if (previewFace === "all") {
      sheets.push(
        {
          key: `preview-front-${pageIndex}`,
          pageUsers,
          mode: "single-side",
          isBackside: false,
          sheetNumber: pageIndex * 2 + 1,
          totalSheets: pages.length * 2,
          badgeText: `Frente de Hoja (${formatLabel})`,
        },
        {
          key: `preview-back-${pageIndex}`,
          pageUsers,
          mode: "single-side",
          isBackside: true,
          sheetNumber: pageIndex * 2 + 2,
          totalSheets: pages.length * 2,
          badgeText: `Reverso de Hoja (${formatLabel})`,
        }
      );
      return;
    }

    const isBack = previewFace === "back";
    sheets.push({
      key: `preview-${isBack ? "back" : "front"}-${pageIndex}`,
      pageUsers,
      mode: "single-side",
      isBackside: isBack,
      sheetNumber: pageIndex + 1,
      totalSheets: pages.length,
      badgeText: `${isBack ? "Reverso" : "Frente"} de Hoja (${formatLabel})`,
    });
  });

  return sheets;
}

function getSheetPillClass(sheet: PreviewSheetDescriptor): string {
  if (sheet.mode === "same-sheet") {
    return "bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300";
  }
  if (sheet.isBackside) {
    return "bg-amber-500/15 border-amber-500/30 text-amber-700 dark:text-amber-300";
  }
  return "bg-primary-500/15 border-primary-500/30 text-primary-700 dark:text-primary-300";
}

function getSimulatedSheetWidth(
  format: SheetFormat,
  orientation: "vertical" | "horizontal",
  zoomLevel: number
): string {
  if (format !== "a4") return `${Math.round(330 * zoomLevel)}px`;
  const baseWidth = orientation === "horizontal" ? 620 : 480;
  return `${Math.round(baseWidth * zoomLevel)}px`;
}

interface PrintPageSideProps {
  format: SheetFormat;
  pageUsers: CredentialUser[];
  qrDataUrls: Record<string, string>;
  options: CredentialBadgeOptions;
  isBackside: boolean;
}

function PrintPageSide({
  format,
  pageUsers,
  qrDataUrls,
  options,
  isBackside,
}: Readonly<PrintPageSideProps>) {
  const keyPrefix = isBackside ? "back" : "front";
  return (
    <div
      className="print-page-break bg-white"
      style={{
        width: format === "a4" ? "210mm" : "85.6mm",
        height: format === "a4" ? "297mm" : "54mm",
        padding: format === "a4" ? "10mm" : "0mm",
        margin: "0 auto",
        boxSizing: "border-box",
      }}
    >
      {format === "a4" ? (
        <div className="grid grid-cols-2 gap-x-[10mm] gap-y-[10mm] items-start justify-items-center">
          {pageUsers.map((user) => (
            <div key={`badge-print-${keyPrefix}-${user.id}`} className="print-avoid-break flex justify-center">
              <CredentialBadge
                user={user}
                qrDataUrl={qrDataUrls[user.id]}
                options={options}
                isPrintMode={true}
                isBackside={isBackside}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="w-full h-full flex items-center justify-center">
          {pageUsers[0] && (
            <CredentialBadge
              user={pageUsers[0]}
              qrDataUrl={qrDataUrls[pageUsers[0].id]}
              options={{ ...options, showCropMarks: false }}
              isPrintMode={true}
              isBackside={isBackside}
            />
          )}
        </div>
      )}
    </div>
  );
}

interface CredentialPrintPortalProps {
  pages: CredentialUser[][];
  isSameSheet: boolean;
  format: SheetFormat;
  options: CredentialBadgeOptions;
  qrDataUrls: Record<string, string>;
}

/**
 * Hidden print-only DOM portal rendered at document.body for @media print output.
 */
export function CredentialPrintPortal({
  pages,
  isSameSheet,
  format,
  options,
  qrDataUrls,
}: Readonly<CredentialPrintPortalProps>) {
  const pvcSize =
    options.orientation === "horizontal" ? "85.6mm 54mm landscape" : "54mm 85.6mm portrait";

  return (
    <div id="credential-print-portal" className="hidden print:block">
      {pages.map((pageUsers) => (
        <React.Fragment key={`print-page-group-${pageUsers.map((u) => u.id).join("-")}`}>
          {isSameSheet ? (
            <div
              className="print-page-break bg-white"
              style={{
                width: "210mm",
                height: "297mm",
                padding: "10mm",
                margin: "0 auto",
                boxSizing: "border-box",
              }}
            >
              <div className="grid grid-cols-2 gap-x-[10mm] gap-y-[10mm] items-start justify-items-center">
                {pageUsers.map((user) => (
                  <React.Fragment key={`badge-print-pair-${user.id}`}>
                    <div className="print-avoid-break flex justify-center">
                      <CredentialBadge
                        user={user}
                        qrDataUrl={qrDataUrls[user.id]}
                        options={options}
                        isPrintMode={true}
                        isBackside={false}
                      />
                    </div>
                    <div className="print-avoid-break flex justify-center">
                      <CredentialBadge
                        user={user}
                        qrDataUrl={qrDataUrls[user.id]}
                        options={options}
                        isPrintMode={true}
                        isBackside={true}
                      />
                    </div>
                  </React.Fragment>
                ))}
              </div>
            </div>
          ) : (
            <>
              <PrintPageSide
                format={format}
                pageUsers={pageUsers}
                qrDataUrls={qrDataUrls}
                options={options}
                isBackside={false}
              />
              {options.includeBackside && (
                <PrintPageSide
                  format={format}
                  pageUsers={pageUsers}
                  qrDataUrls={qrDataUrls}
                  options={options}
                  isBackside={true}
                />
              )}
            </>
          )}
        </React.Fragment>
      ))}
      <style jsx global>{`
        @media print {
          @page {
            size: ${format === "a4" ? "A4 portrait" : pvcSize};
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}

interface BulkPrintPreviewPaneProps {
  visibleOnMobile: boolean;
  options: CredentialBadgeOptions;
  isSameSheet: boolean;
  previewFace: PreviewFace;
  setPreviewFace: (face: PreviewFace) => void;
  previewSheets: PreviewSheetDescriptor[];
  pagesCount: number;
  activeUsersCount: number;
  onClearExcluded: () => void;
  isGeneratingQrs: boolean;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  format: SheetFormat;
  qrDataUrls: Record<string, string>;
}

function PreviewSheetContent({
  format,
  sheet,
  options,
  qrDataUrls,
  zoomLevel,
}: Readonly<{
  format: SheetFormat;
  sheet: PreviewSheetDescriptor;
  options: CredentialBadgeOptions;
  qrDataUrls: Record<string, string>;
  zoomLevel: number;
}>) {
  const scale = zoomLevel === 1 ? undefined : zoomLevel;

  if (format !== "a4") {
    return (
      <div className="flex justify-center w-full">
        {sheet.pageUsers[0] && (
          <CredentialBadge
            user={sheet.pageUsers[0]}
            qrDataUrl={qrDataUrls[sheet.pageUsers[0].id]}
            options={{ ...options, showCropMarks: false }}
            scale={scale}
            isBackside={sheet.isBackside}
          />
        )}
      </div>
    );
  }

  if (sheet.mode === "same-sheet") {
    return (
      <div className="grid grid-cols-2 gap-3.5 sm:gap-4 items-start justify-items-center w-full">
        {sheet.pageUsers.map((user) => (
          <React.Fragment key={`preview-pair-${user.id}`}>
            <div className="flex flex-col items-center gap-1 w-full min-w-0">
              <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                Frente
              </span>
              <CredentialBadge
                user={user}
                qrDataUrl={qrDataUrls[user.id]}
                options={options}
                scale={scale}
                isBackside={false}
              />
            </div>
            <div className="flex flex-col items-center gap-1 w-full min-w-0">
              <span className="text-[10.5px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                Reverso
              </span>
              <CredentialBadge
                user={user}
                qrDataUrl={qrDataUrls[user.id]}
                options={options}
                scale={scale}
                isBackside={true}
              />
            </div>
          </React.Fragment>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3.5 sm:gap-4 items-start justify-items-center w-full">
      {sheet.pageUsers.map((user) => (
        <div
          key={`preview-user-${user.id}-${sheet.isBackside ? "back" : "front"}`}
          className="flex justify-center w-full min-w-0"
        >
          <CredentialBadge
            user={user}
            qrDataUrl={qrDataUrls[user.id]}
            options={options}
            scale={scale}
            isBackside={sheet.isBackside}
          />
        </div>
      ))}
    </div>
  );
}

function PreviewHeaderStatus({
  includeBackside,
  isSameSheet,
  previewFace,
  setPreviewFace,
  previewSheetsCount,
  pagesCount,
  activeUsersCount,
}: Readonly<{
  includeBackside: boolean;
  isSameSheet: boolean;
  previewFace: PreviewFace;
  setPreviewFace: (face: PreviewFace) => void;
  previewSheetsCount: number;
  pagesCount: number;
  activeUsersCount: number;
}>) {
  if (!includeBackside) {
    return (
      <div className="flex items-center gap-1.5 text-surface-600 dark:text-slate-400 text-[11px]">
        <Eye className="w-3.5 h-3.5" />
        <span>
          {pagesCount} {pagesCount === 1 ? "hoja" : "hojas"} ({activeUsersCount}{" "}
          {activeUsersCount === 1 ? "credencial" : "credenciales"})
        </span>
      </div>
    );
  }

  if (isSameSheet) {
    return (
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-semibold text-[11px]">
        <Layers className="w-3.5 h-3.5 text-emerald-500" />
        <span>
          Frente y Reverso juntos en la misma hoja ({previewSheetsCount}{" "}
          {previewSheetsCount === 1 ? "hoja" : "hojas"})
        </span>
      </div>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Seleccionar cara de vista previa"
      className="flex items-center p-0.5 rounded-lg bg-white dark:bg-white/5 border border-slate-300 dark:border-white/10 text-[11px] font-semibold"
    >
      {(
        [
          { id: "all", label: "Ambas Caras" },
          { id: "front", label: "Solo Frente" },
          { id: "back", label: "Solo Reverso" },
        ] as const
      ).map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={previewFace === tab.id}
          onClick={() => setPreviewFace(tab.id)}
          className={`px-2.5 py-1 rounded transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 ${
            previewFace === tab.id
              ? "bg-primary-500 text-white shadow-sm"
              : "text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white"
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Interactive right-hand preview canvas with zoom controls and simulated A4/PVC sheets.
 */
export function BulkPrintPreviewPane({
  visibleOnMobile,
  options,
  isSameSheet,
  previewFace,
  setPreviewFace,
  previewSheets,
  pagesCount,
  activeUsersCount,
  onClearExcluded,
  isGeneratingQrs,
  zoomLevel,
  setZoomLevel,
  format,
  qrDataUrls,
}: Readonly<BulkPrintPreviewPaneProps>) {
  return (
    <div
      className={`flex-1 flex flex-col min-w-0 bg-slate-200/90 dark:bg-[#070c14] overflow-hidden ${
        visibleOnMobile ? "flex" : "hidden lg:flex"
      }`}
    >
      <div className="px-4 py-2 bg-slate-100 dark:bg-[#0e1726] border-b border-slate-300 dark:border-white/10 flex items-center justify-between text-xs shrink-0 gap-2 flex-wrap">
        <div className="flex items-center gap-2">
          <PreviewHeaderStatus
            includeBackside={Boolean(options.includeBackside)}
            isSameSheet={isSameSheet}
            previewFace={previewFace}
            setPreviewFace={setPreviewFace}
            previewSheetsCount={previewSheets.length}
            pagesCount={pagesCount}
            activeUsersCount={activeUsersCount}
          />

          {isGeneratingQrs && (
            <span className="inline-flex items-center gap-1 text-[11px] text-primary-500 animate-pulse font-semibold ml-1">
              <Sparkles className="w-3 h-3" /> Generando QRs...
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 bg-white dark:bg-white/5 rounded-lg border border-slate-300 dark:border-white/10 p-1">
          <button
            type="button"
            disabled={zoomLevel <= 0.7}
            onClick={() => setZoomLevel((z) => Math.max(0.7, Math.round((z - 0.1) * 10) / 10))}
            className="w-8 h-8 sm:w-7 sm:h-7 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            title="Reducir zoom"
            aria-label="Reducir zoom"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span
            aria-live="polite"
            className="text-[11px] font-mono px-1.5 text-slate-700 dark:text-slate-200 min-w-[3ch] text-center"
          >
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            type="button"
            disabled={zoomLevel >= 1.2}
            onClick={() => setZoomLevel((z) => Math.min(1.2, Math.round((z + 0.1) * 10) / 10))}
            className="w-8 h-8 sm:w-7 sm:h-7 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            title="Aumentar zoom"
            aria-label="Aumentar zoom"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={zoomLevel === 1}
            onClick={() => setZoomLevel(1.0)}
            className="w-8 h-8 sm:w-7 sm:h-7 rounded flex items-center justify-center hover:bg-slate-100 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
            title="Restablecer zoom al 100%"
            aria-label="Restablecer zoom al 100%"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 sm:p-6 flex flex-col items-center gap-6 min-h-0">
        {activeUsersCount === 0 ? (
          <div className="my-auto max-w-sm w-full bg-white dark:bg-surface-900 border border-surface-200 dark:border-white/10 rounded-2xl p-6 text-center shadow-lg">
            <div className="w-11 h-11 rounded-xl bg-primary-500/10 text-primary-500 flex items-center justify-center mx-auto mb-3">
              <Users className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-surface-900 dark:text-white mb-1">
              Ningún colaborador seleccionado
            </h3>
            <p className="text-xs text-surface-500 dark:text-slate-400 mb-4">
              Has desmarcado a todos los colaboradores de esta tanda de impresión. Incluye al menos
              uno para generar la vista previa.
            </p>
            <button
              type="button"
              onClick={onClearExcluded}
              className="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-bold transition cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 focus-visible:ring-offset-2"
            >
              Incluir todos los colaboradores
            </button>
          </div>
        ) : (
          previewSheets.map((sheet) => (
            <div key={sheet.key} className="flex flex-col items-center shrink-0 mx-auto">
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">
                  Página {sheet.sheetNumber} de {sheet.totalSheets}
                </span>
                <span
                  className={`text-[10.5px] font-black uppercase px-2.5 py-0.5 rounded-full border ${getSheetPillClass(sheet)}`}
                >
                  {sheet.badgeText}
                </span>
              </div>

              <div
                style={{ width: getSimulatedSheetWidth(format, options.orientation, zoomLevel) }}
                className="bg-white text-slate-900 shadow-xl rounded-xl p-4 sm:p-5 box-border border border-slate-300/80 transition-all duration-150"
              >
                <PreviewSheetContent
                  format={format}
                  sheet={sheet}
                  options={options}
                  qrDataUrls={qrDataUrls}
                  zoomLevel={zoomLevel}
                />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
