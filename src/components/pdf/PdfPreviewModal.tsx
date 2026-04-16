import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import { useUIStore } from "../../store/uiStore";
import { useCVStore } from "../../store/cvStore";
import { generatePdfDefinition } from "./generatePdf";

pdfMake.addVirtualFileSystem(pdfFonts);

export function PdfPreviewModal() {
  const open = useUIStore((s) => s.pdfModalOpen);
  const close = useUIStore((s) => s.setPdfModalOpen);
  const cv = useCVStore((s) => s.activeCv());
  const [blobUrl, setBlobUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !cv) return;

    let revoked = false;
    const def = generatePdfDefinition(cv);
    pdfMake.createPdf(def).getBlob().then((blob) => {
      if (revoked) return;
      const url = URL.createObjectURL(blob);
      setBlobUrl(url);
    });

    return () => {
      revoked = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [open, cv]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={() => close(false)}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-[90vw] h-[90vh] max-w-225 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-medium text-primary"><Trans>PDF Preview</Trans></span>
          <button
            onClick={() => close(false)}
            className="text-light hover:text-muted transition-colors text-lg"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 p-2">
          {blobUrl ? (
            <iframe
              src={blobUrl}
              className="w-full h-full rounded border border-gray-200"
              title="PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-sm text-light">
              <Trans>Generating PDF...</Trans>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
