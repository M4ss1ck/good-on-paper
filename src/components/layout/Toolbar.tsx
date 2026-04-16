import { useRef, useState, useEffect } from "react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { useCVStore } from "../../store/cvStore";
import { useUIStore } from "../../store/uiStore";
import { useAIStore } from "../../store/aiStore";
import { generatePdfDefinition } from "../pdf/generatePdf";
import { ProviderSettings } from "../ai/ProviderSettings";
import { DetectAIText } from "../ai/DetectAIText";
import { TailorToJob } from "../ai/TailorToJob";
import { CVSwitcher } from "../workspace/CVSwitcher";

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
  const dropdownRef = useRef<HTMLDivElement>(null);

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
    "px-3 py-1.5 text-sm rounded border border-gray-200 text-muted hover:text-primary hover:border-accent transition-colors";

  const saveLabel =
    saveStatus === "saving"
      ? "Saving..."
      : saveStatus === "saved"
        ? "Saved"
        : "";

  return (
    <div className="flex items-center gap-2 px-6 py-3 border-b border-gray-200 bg-white">
      <span className="text-sm font-semibold text-primary">
        Good on Paper
      </span>

      <CVSwitcher />

      <span className="mr-auto" />

      {saveLabel && (
        <span className="text-xs text-light mr-1">{saveLabel}</span>
      )}

      <button className={btnClass} onClick={handlePreviewPdf}>
        Preview PDF
      </button>
      <button className={btnClass} onClick={handleDownloadPdf}>
        Download PDF
      </button>
      <button className={btnClass} onClick={handleExportJson}>
        Export JSON
      </button>
      <button
        className={btnClass}
        onClick={() => fileInputRef.current?.click()}
      >
        Import JSON
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

      <div className="relative" ref={dropdownRef}>
        <button
          className={btnClass}
          onClick={() => setAiDropdownOpen((v) => !v)}
        >
          ✨ AI
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
              🔍 AI Phrase Check
            </button>
            <button
              className="w-full text-left px-4 py-2 text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-50"
              disabled={!hasProvider}
              onClick={() => {
                setTailorOpen(true);
                setAiDropdownOpen(false);
              }}
            >
              🎯 Tailor to Job
            </button>
            <hr className="my-1 border-gray-100" />
            <button
              className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
              onClick={() => {
                setSettingsOpen(true);
                setAiDropdownOpen(false);
              }}
            >
              ⚙️ Settings
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
            Confirm Reset
          </button>
          <button
            onClick={() => setConfirmReset(false)}
            className="px-2 py-1 rounded border border-gray-200 text-muted hover:text-primary transition-colors"
          >
            Cancel
          </button>
        </span>
      ) : (
        <button className={btnClass} onClick={handleReset}>
          New CV
        </button>
      )}
      <ProviderSettings />
    </div>
  );
}
