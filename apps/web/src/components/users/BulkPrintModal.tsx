"use client";

import React, { useState, useEffect, useMemo } from "react";
import ReactDOM from "react-dom";
import useSWR from "swr";
import QRCode from "qrcode";
import { Eye, Palette } from "lucide-react";
import { type CredentialBadgeOptions, type CredentialUser } from "./CredentialBadge";
import { downloadCredentialsAsPng } from "@/lib/credentialCanvasExport";
import {
  buildPreviewSheets,
  BulkPrintPreviewPane,
  computeItemsPerPage,
  CredentialPrintPortal,
  type BacksideLayout,
  type PreviewFace,
  type SheetFormat,
} from "./BulkPrintSheet";
import { BulkPrintHeader, BulkPrintSettingsSidebar } from "./BulkPrintSettingsSidebar";

export type { SheetFormat, BacksideLayout };

interface BulkPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  users: CredentialUser[];
  defaultOrgName?: string;
}

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function BulkPrintModal({
  isOpen,
  onClose,
  users,
  defaultOrgName = "Hotel Italia",
}: BulkPrintModalProps) {
  const { data: orgData } = useSWR(isOpen ? "/api/organization" : null, fetcher);

  const orgNameFromApi = orgData?.organization?.name || defaultOrgName;
  const orgLogoFromApi = orgData?.organization?.logoUrl || "/brand/logo.png";

  const [excludedUserIds, setExcludedUserIds] = useState<string[]>([]);
  const [isUsersDropdownOpen, setIsUsersDropdownOpen] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setExcludedUserIds([]);
    }
  }, [isOpen, users]);

  const [format, setFormat] = useState<SheetFormat>("a4");
  const [backsideLayout, setBacksideLayout] = useState<BacksideLayout>("same-sheet");
  const [previewFace, setPreviewFace] = useState<PreviewFace>("all");
  const [isDownloading, setIsDownloading] = useState(false);
  const [mobileTab, setMobileTab] = useState<"settings" | "preview">("preview");

  const [options, setOptions] = useState<CredentialBadgeOptions>({
    orientation: "vertical",
    showAvatar: true,
    showLogo: true,
    showDocumentId: true,
    showLocation: true,
    showRole: true,
    showToken: false,
    showCropMarks: true,
    accentColor: "#00A650",
    organizationName: orgNameFromApi,
    logoUrl: orgLogoFromApi,
    includeBackside: false,
    showValidity: false,
    validityText: "2026 - 2027",
    backsidePolicyText:
      "Esta credencial es propiedad de la empresa. Su uso es personal e intransferible. Debe portarse en lugar visible.",
    backsideContactText:
      "En caso de extravío, devolver en Recepción o comunicarse con el dpto. de Recursos Humanos.",
  });

  useEffect(() => {
    if (orgData?.organization) {
      setOptions((prev) => ({
        ...prev,
        organizationName: prev.organizationName || orgData.organization.name,
        logoUrl: orgData.organization.logoUrl || prev.logoUrl || "/brand/logo.png",
      }));
    }
  }, [orgData]);

  const activeUsers = useMemo(
    () => users.filter((u) => !excludedUserIds.includes(u.id)),
    [users, excludedUserIds]
  );

  const [zoomLevel, setZoomLevel] = useState<number>(1.0);
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [isGeneratingQrs, setIsGeneratingQrs] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    globalThis.addEventListener("keydown", handleKeyDown);
    return () => globalThis.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || activeUsers.length === 0) return;

    let isCancelled = false;
    async function generateAll() {
      setIsGeneratingQrs(true);
      const generated: Record<string, string> = {};

      for (const u of activeUsers) {
        if (isCancelled) break;
        // Para impresión física (PVC o papel), SIEMPRE se debe usar el QR Fijo (qrToken UUID).
        const payload = u.qrToken;
        if (!payload) continue;

        try {
          generated[u.id] = await QRCode.toDataURL(payload, {
            width: 380,
            margin: 1,
            color: { dark: "#060E17", light: "#FFFFFF" },
            errorCorrectionLevel: "H",
          });
        } catch (err) {
          console.error("Error generating QR for badge", u.id, err);
        }
      }

      if (!isCancelled) {
        setQrDataUrls(generated);
        setIsGeneratingQrs(false);
      }
    }

    generateAll();
    return () => {
      isCancelled = true;
    };
  }, [isOpen, activeUsers]);

  const isSameSheet =
    format === "a4" && Boolean(options.includeBackside) && backsideLayout === "same-sheet";

  const itemsPerPage = computeItemsPerPage(format, isSameSheet, options.orientation);

  const pages = useMemo(() => {
    if (format === "pvc") {
      return activeUsers.map((u) => [u]);
    }
    const chunks: CredentialUser[][] = [];
    for (let i = 0; i < activeUsers.length; i += itemsPerPage) {
      chunks.push(activeUsers.slice(i, i + itemsPerPage));
    }
    return chunks;
  }, [activeUsers, format, itemsPerPage]);

  const totalPrintSheets = useMemo(() => {
    if (format === "pvc") {
      return activeUsers.length * (options.includeBackside ? 2 : 1);
    }
    if (!options.includeBackside || isSameSheet) {
      return pages.length;
    }
    return pages.length * 2;
  }, [format, activeUsers.length, options.includeBackside, isSameSheet, pages.length]);

  const previewSheets = useMemo(
    () =>
      buildPreviewSheets(
        pages,
        Boolean(options.includeBackside),
        isSameSheet,
        previewFace,
        format
      ),
    [pages, options.includeBackside, isSameSheet, previewFace, format]
  );

  if (!isOpen || !mounted) return null;

  const updateOption = <K extends keyof CredentialBadgeOptions>(
    key: K,
    value: CredentialBadgeOptions[K]
  ) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const toggleExcludeUser = (userId: string) => {
    setExcludedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleDownloadPng = async () => {
    if (activeUsers.length === 0) return;
    setIsDownloading(true);
    try {
      await downloadCredentialsAsPng(activeUsers, qrDataUrls, options);
    } finally {
      setIsDownloading(false);
    }
  };

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-5 md:p-6 bg-slate-950/80 backdrop-blur-md overflow-hidden animate-fade-in print:hidden"
    >
      <div className="fixed inset-0 -z-10" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-6xl h-[92dvh] sm:h-[88vh] max-h-[860px] bg-surface-50 dark:bg-surface-900 border border-surface-200 dark:border-surface-800 rounded-2xl sm:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-scale-up">
        <BulkPrintHeader
          users={users}
          activeUsersCount={activeUsers.length}
          excludedUserIds={excludedUserIds}
          isUsersDropdownOpen={isUsersDropdownOpen}
          setIsUsersDropdownOpen={setIsUsersDropdownOpen}
          onClearExcluded={() => setExcludedUserIds([])}
          onToggleExcludeUser={toggleExcludeUser}
          accentColor={options.accentColor}
          isDownloading={isDownloading}
          isGeneratingQrs={isGeneratingQrs}
          totalPrintSheets={totalPrintSheets}
          onDownloadPng={handleDownloadPng}
          onPrint={() => globalThis.print()}
          onClose={onClose}
        />

        <div className="lg:hidden flex items-center justify-center p-2 bg-white dark:bg-surface-950 border-b border-surface-200 dark:border-surface-800 shrink-0">
          <div className="flex rounded-xl bg-surface-100 dark:bg-surface-850 p-0.5 w-full max-w-xs text-xs font-semibold">
            <button
              type="button"
              onClick={() => setMobileTab("settings")}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileTab === "settings"
                  ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-xs font-bold"
                  : "text-surface-500 hover:text-surface-900 dark:hover:text-white"
              }`}
            >
              <Palette className="w-3.5 h-3.5 text-primary-500" />
              <span>Ajustes</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileTab("preview")}
              className={`flex-1 py-1.5 rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                mobileTab === "preview"
                  ? "bg-white dark:bg-surface-700 text-surface-900 dark:text-white shadow-xs font-bold"
                  : "text-surface-500 hover:text-surface-900 dark:hover:text-white"
              }`}
            >
              <Eye className="w-3.5 h-3.5 text-primary-500" />
              <span>Vista Previa</span>
            </button>
          </div>
        </div>

        <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
          <BulkPrintSettingsSidebar
            visibleOnMobile={mobileTab === "settings"}
            usersCount={users.length}
            format={format}
            setFormat={setFormat}
            backsideLayout={backsideLayout}
            setBacksideLayout={setBacksideLayout}
            setPreviewFace={setPreviewFace}
            options={options}
            updateOption={updateOption}
          />

          <BulkPrintPreviewPane
            visibleOnMobile={mobileTab === "preview"}
            options={options}
            isSameSheet={isSameSheet}
            previewFace={previewFace}
            setPreviewFace={setPreviewFace}
            previewSheets={previewSheets}
            pagesCount={pages.length}
            activeUsersCount={activeUsers.length}
            isGeneratingQrs={isGeneratingQrs}
            zoomLevel={zoomLevel}
            setZoomLevel={setZoomLevel}
            format={format}
            qrDataUrls={qrDataUrls}
          />
        </div>
      </div>
    </div>
  );

  return (
    <>
      {ReactDOM.createPortal(modalContent, document.body)}
      {ReactDOM.createPortal(
        <CredentialPrintPortal
          pages={pages}
          isSameSheet={isSameSheet}
          format={format}
          options={options}
          qrDataUrls={qrDataUrls}
        />,
        document.body
      )}
    </>
  );
}
