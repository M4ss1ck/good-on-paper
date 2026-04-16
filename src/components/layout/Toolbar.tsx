import { useRef, useState, useEffect } from "react";
import { Sparkles, Search, Target, Globe, Settings } from "lucide-react";
import { Link } from "react-router";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useLingui } from "@lingui/react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { useCVStore } from "../../store/cvStore";
import { useUIStore } from "../../store/uiStore";
import { useAIStore } from "../../store/aiStore";
import { generatePdfDefinition } from "../pdf/generatePdf";
import { ProviderSettings } from "../ai/ProviderSettings";
import { DetectAIText } from "../ai/DetectAIText";
import { TailorToJob } from "../ai/TailorToJob";
import { TranslateCV } from "../ai/TranslateCV";
import { CVSwitcher } from "../workspace/CVSwitcher";
import { DiffPicker } from "../diff/DiffPicker";
import { loadCatalog, type AppLocale } from "../../i18n";

pdfMake.addVirtualFileSystem(pdfFonts);

export function Toolbar() {
  const cv = useCVStore((s) => s.activeCv());
  const exportJson = useCVStore((s) => s.exportJson);
  const importJson = useCVStore((s) => s.importJson);
  const resetCV = useCVStore((s) => s.resetCV);
  const openModal = useUIStore((s) => s.setPdfModalOpen);
  const saveStatus = useUIStore((s) => s.saveStatus);
  const setSettingsOpen = useAIStore((s) => s.setSettingsOpen);
  const hasProvider = useAIStore((s) => s.settings.provider !== null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  // AI dropdown state
  const [aiDropdownOpen, setAiDropdownOpen] = useState(false);
  const [detectOpen, setDetectOpen] = useState(false);
  const [tailorOpen, setTailorOpen] = useState(false);
  const [translateOpen, setTranslateOpen] = useState(false);
  const [diffPickerOpen, setDiffPickerOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Locale toggle
  const { i18n } = useLingui();
  const currentLocale = i18n.locale as AppLocale;
  const toggleLocale = () => {
    const next: AppLocale = currentLocale === "en" ? "es" : "en";
    loadCatalog(next);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!aiDropdownOpen) return;
    const handle = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAiDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [aiDropdownOpen]);

  const handlePreviewPdf = () => {
    openModal(true);
  };

  const handleDownloadPdf = () => {
    if (!cv) return;
    const def = generatePdfDefinition(cv);
    pdfMake.createPdf(def).download("cv.pdf");
  };

  const handleExportJson = () => {
    const json = exportJson();
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "cv.json";
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        importJson(reader.result);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetCV();
    setConfirmReset(false);
  };

  const btnClass =
    "px-3 py-1.5 text-sm rounded border border-gray-200 text-muted hover:text-primary hover:border-accent transition-colors flex flex-row items-center gap-1";

  const saveLabel =
    saveStatus === "saving"
      ? t`Saving...`
      : saveStatus === "saved"
        ? t`Saved`
        : "";

  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white">
      <Link
        to="/"
        onClick={() => localStorage.setItem("gop-last-page", "/")}
        className="text-sm font-semibold text-primary hover:text-accent transition-colors"
      >
        Good on Paper
      </Link>

      <CVSwitcher />

      <span className="mr-auto" />

      {saveLabel && (
        <span className="text-xs text-light mr-1">{saveLabel}</span>
      )}

      <button className={btnClass} onClick={handlePreviewPdf}>
        <Trans>Preview PDF</Trans>
      </button>
      <button className={btnClass} onClick={handleDownloadPdf}>
        <Trans>Download PDF</Trans>
      </button>
      <button className={btnClass} onClick={() => setDiffPickerOpen(true)}>
        <Trans>Compare</Trans>
      </button>
      <button className={btnClass} onClick={handleExportJson}>
        <Trans>Export JSON</Trans>
      </button>
      <button
        className={btnClass}
        onClick={() => fileInputRef.current?.click()}
      >
        <Trans>Import JSON</Trans>
      </button>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        className="hidden"
        onChange={handleImportJson}
      />

      <DetectAIText open={detectOpen} onClose={() => setDetectOpen(false)} />

      <TailorToJob open={tailorOpen} onClose={() => setTailorOpen(false)} />

      <TranslateCV open={translateOpen} onClose={() => setTranslateOpen(false)} />

      <div className="relative" ref={dropdownRef}>
        <button
          className={btnClass}
          onClick={() => setAiDropdownOpen((v) => !v)}
        >
          <Sparkles size={14} /> AI
        </button>
        {aiDropdownOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-40 py-1">
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setDetectOpen(true);
                setAiDropdownOpen(false);
              }}
            >
              <Search size={14} className="inline mr-1.5" /><Trans>AI Phrase Check</Trans>
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-50"
              disabled={!hasProvider}
              onClick={() => {
                setTailorOpen(true);
                setAiDropdownOpen(false);
              }}
            >
              <Target size={14} className="inline mr-1.5" /><Trans>Tailor to Job</Trans>
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-50"
              disabled={!hasProvider}
              onClick={() => {
                setTranslateOpen(true);
                setAiDropdownOpen(false);
              }}
            >
              <Globe size={14} className="inline mr-1.5" /><Trans>Translate</Trans>
            </button>
            <hr className="my-1 border-gray-100" />
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setSettingsOpen(true);
                setAiDropdownOpen(false);
              }}
            >
              <Settings size={14} className="inline mr-1.5" /><Trans>Settings</Trans>
            </button>
          </div>
        )}
      </div>

      {confirmReset ? (
        <span className="flex items-center gap-1 text-xs">
          <button
            onClick={handleReset}
            className="px-2 py-1 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
          >
            <Trans>Confirm Reset</Trans>
          </button>
          <button
            onClick={() => setConfirmReset(false)}
            className="px-2 py-1 rounded border border-gray-200 text-muted hover:text-primary transition-colors"
          >
            <Trans>Cancel</Trans>
          </button>
        </span>
      ) : (
        <button className={btnClass} onClick={handleReset}>
          <Trans>New CV</Trans>
        </button>
      )}

      <button
        className="px-2 py-1.5 text-xs font-medium rounded border border-gray-200 text-muted hover:text-primary hover:border-accent transition-colors"
        onClick={toggleLocale}
      >
        {currentLocale === "en" ? "ES" : "EN"}
      </button>

      <ProviderSettings />
      {diffPickerOpen && (
        <DiffPicker onClose={() => setDiffPickerOpen(false)} />
      )}
    </div>
  );
}
