import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useUIStore } from "../../store/uiStore";
import { useCVStore } from "../../store/cvStore";
import { pdfBlob, renderPdf } from "./renderPdf";
import { useFocusTrap } from "../../hooks/useFocusTrap";

export function PdfPreviewModal() {
  const open = useUIStore((s) => s.pdfModalOpen);
  const close = useUIStore((s) => s.setPdfModalOpen);
  const cv = useCVStore((s) => s.activeCv());
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!open || !cv) return;

    let revoked = false;
    renderPdf(cv)
      .then((bytes) => {
        if (revoked) return;
        const url = URL.createObjectURL(pdfBlob(bytes));
        setBlobUrl(url);
      })
      .catch((error: unknown) => {
        if (revoked) return;
        console.error("PDF preview failed", error);
        setFailed(true);
      });

    return () => {
      revoked = true;
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
      setFailed(false);
    };
  }, [open, cv]);

  const handleClose = () => close(false);
  const trapRef = useFocusTrap<HTMLDivElement>(handleClose);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={handleClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-preview-title"
        className="bg-white rounded-lg shadow-lg w-[95vw] h-[90dvh] sm:w-[90vw] max-w-225 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="pdf-preview-title" className="text-sm font-medium text-primary"><Trans>PDF Preview</Trans></h2>
          <button
            onClick={handleClose}
            aria-label={t`Close`}
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
          ) : failed ? (
            <div role="alert" className="flex items-center justify-center h-full text-sm text-red-700">
              <Trans>Could not generate the PDF. Close this window and try again.</Trans>
            </div>
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
