import { useRef, useState } from "react";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { useCVStore } from "../../store/cvStore";
import { useUIStore } from "../../store/uiStore";
import { generatePdfDefinition } from "../pdf/generatePdf";

pdfMake.addVirtualFileSystem(pdfFonts);

export function Toolbar() {
  const cv = useCVStore((s) => s.cv);
  const exportJson = useCVStore((s) => s.exportJson);
  const importJson = useCVStore((s) => s.importJson);
  const resetCV = useCVStore((s) => s.resetCV);
  const openModal = useUIStore((s) => s.setPdfModalOpen);
  const saveStatus = useUIStore((s) => s.saveStatus);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  const handlePreviewPdf = () => {
    openModal(true);
  };

  const handleDownloadPdf = () => {
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
      <span className="text-sm font-semibold text-primary mr-auto">
        Good on Paper
      </span>

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
    </div>
  );
}
