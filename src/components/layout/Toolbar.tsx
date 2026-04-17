import { useRef, useState, useEffect } from "react";
import { Sparkles, Search, Target, Globe, Settings, Eye, Download, GitCompare, Upload, FileDown, FilePlus, MoreHorizontal } from "lucide-react";
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
  const [actionsOpen, setActionsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const actionsRef = useRef<HTMLDivElement>(null);

  // Locale toggle
  const { i18n } = useLingui();
  const currentLocale = i18n.locale as AppLocale;
  const toggleLocale = () => {
    const next: AppLocale = currentLocale === "en" ? "es" : "en";
    loadCatalog(next);
  };

  // Close dropdown on outside click
  useEffect(() => {
    if (!aiDropdownOpen && !actionsOpen) return;
    const handle = (e: MouseEvent) => {
      if (aiDropdownOpen && dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAiDropdownOpen(false);
      }
      if (actionsOpen && actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setActionsOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [aiDropdownOpen, actionsOpen]);

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

  const btnBase =
    "h-8 px-2 text-sm rounded border border-gray-200 text-muted hover:text-primary hover:border-accent transition-colors items-center justify-center gap-1.5 whitespace-nowrap";

  const dropItemClass =
    "w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors flex items-center gap-2";

  const saveLabel =
    saveStatus === "saving"
      ? t`Saving...`
      : saveStatus === "saved"
        ? t`Saved`
        : "";

  return (
    <div className="flex items-center gap-1.5 px-3 py-2 border-b border-gray-200 bg-white md:px-4 lg:px-6">
      <Link
        to="/"
        onClick={() => localStorage.setItem("gop-last-page", "/")}
        className="text-sm font-semibold text-primary hover:text-accent transition-colors shrink-0"
      >
        Good on Paper
      </Link>

      <CVSwitcher />

      <span className="mr-auto" />

      {saveLabel && (
        <span className="text-xs text-light mr-1 shrink-0">{saveLabel}</span>
      )}

      {/* ── Small screens: single "Actions" dropdown with ALL actions ── */}
      <div className="relative md:hidden" ref={actionsRef}>
        <button
          className={`${btnBase} inline-flex`}
          onClick={() => setActionsOpen((v) => !v)}
          title={t`Actions`}
        >
          <MoreHorizontal size={14} />
        </button>
        {actionsOpen && (
          <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-40 py-1">
            <button className={dropItemClass} onClick={() => { handlePreviewPdf(); setActionsOpen(false); }}>
              <Eye size={14} /><Trans>Preview PDF</Trans>
            </button>
            <button className={dropItemClass} onClick={() => { handleDownloadPdf(); setActionsOpen(false); }}>
              <Download size={14} /><Trans>Download PDF</Trans>
            </button>
            <button className={dropItemClass} onClick={() => { setDiffPickerOpen(true); setActionsOpen(false); }}>
              <GitCompare size={14} /><Trans>Compare</Trans>
            </button>
            <hr className="my-1 border-gray-100" />
            <button className={dropItemClass} onClick={() => { handleExportJson(); setActionsOpen(false); }}>
              <FileDown size={14} /><Trans>Export JSON</Trans>
            </button>
            <button className={dropItemClass} onClick={() => { fileInputRef.current?.click(); setActionsOpen(false); }}>
              <Upload size={14} /><Trans>Import JSON</Trans>
            </button>
            <hr className="my-1 border-gray-100" />
            <button className={dropItemClass} onClick={() => { setDetectOpen(true); setActionsOpen(false); }}>
              <Search size={14} /><Trans>AI Phrase Check</Trans>
            </button>
            <button
              className={`${dropItemClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={!hasProvider}
              onClick={() => { setTailorOpen(true); setActionsOpen(false); }}
            >
              <Target size={14} /><Trans>Tailor to Job</Trans>
            </button>
            <button
              className={`${dropItemClass} disabled:opacity-50 disabled:cursor-not-allowed`}
              disabled={!hasProvider}
              onClick={() => { setTranslateOpen(true); setActionsOpen(false); }}
            >
              <Globe size={14} /><Trans>Translate</Trans>
            </button>
            <button className={dropItemClass} onClick={() => { setSettingsOpen(true); setActionsOpen(false); }}>
              <Settings size={14} /><Trans>AI Settings</Trans>
            </button>
            <hr className="my-1 border-gray-100" />
            {confirmReset ? (
              <>
                <button
                  className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                  onClick={() => { handleReset(); setActionsOpen(false); }}
                >
                  <Trans>Confirm Reset</Trans>
                </button>
                <button className={dropItemClass} onClick={() => { setConfirmReset(false); setActionsOpen(false); }}>
                  <Trans>Cancel</Trans>
                </button>
              </>
            ) : (
              <button className={dropItemClass} onClick={() => { handleReset(); setActionsOpen(false); }}>
                <FilePlus size={14} /><Trans>New CV</Trans>
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── md+ screens: individual icon buttons (text labels at xl+) ── */}
      <button className={`${btnBase} hidden md:inline-flex`} onClick={handlePreviewPdf} title={t`Preview PDF`}>
        <Eye size={14} />
        <span className="hidden xl:inline"><Trans>Preview PDF</Trans></span>
      </button>
      <button className={`${btnBase} hidden md:inline-flex`} onClick={handleDownloadPdf} title={t`Download PDF`}>
        <Download size={14} />
        <span className="hidden xl:inline"><Trans>Download PDF</Trans></span>
      </button>
      <button className={`${btnBase} hidden md:inline-flex`} onClick={() => setDiffPickerOpen(true)} title={t`Compare`}>
        <GitCompare size={14} />
        <span className="hidden xl:inline"><Trans>Compare</Trans></span>
      </button>
      <button className={`${btnBase} hidden md:inline-flex`} onClick={handleExportJson} title={t`Export JSON`}>
        <FileDown size={14} />
        <span className="hidden xl:inline"><Trans>Export JSON</Trans></span>
      </button>
      <button
        className={`${btnBase} hidden md:inline-flex`}
        onClick={() => fileInputRef.current?.click()}
        title={t`Import JSON`}
      >
        <Upload size={14} />
        <span className="hidden xl:inline"><Trans>Import JSON</Trans></span>
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

      <div className="relative hidden md:block" ref={dropdownRef}>
        <button
          className={`${btnBase} inline-flex`}
          onClick={() => setAiDropdownOpen((v) => !v)}
          title="AI"
        >
          <Sparkles size={14} />
          <span className="hidden xl:inline">AI</span>
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
        <span className="hidden md:flex items-center gap-1 text-xs">
          <button
            onClick={handleReset}
            className="h-8 px-2 rounded bg-red-500 text-white hover:bg-red-600 transition-colors text-xs"
          >
            <Trans>Confirm</Trans>
          </button>
          <button
            onClick={() => setConfirmReset(false)}
            className="h-8 px-2 rounded border border-gray-200 text-muted hover:text-primary transition-colors text-xs"
          >
            <Trans>Cancel</Trans>
          </button>
        </span>
      ) : (
        <button className={`${btnBase} hidden md:inline-flex`} onClick={handleReset} title={t`New CV`}>
          <FilePlus size={14} />
          <span className="hidden xl:inline"><Trans>New CV</Trans></span>
        </button>
      )}

      <button
        className={`${btnBase} inline-flex`}
        onClick={toggleLocale}
        title={currentLocale === "en" ? "Español" : "English"}
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
