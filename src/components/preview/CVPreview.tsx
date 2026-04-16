import { useState, useEffect } from "react";
import { CornerDownRight } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { useCVStore } from "../../store/cvStore";
import { PreviewMeta } from "./PreviewMeta";
import { PreviewSection } from "./PreviewSection";
import { DiffPicker } from "../diff/DiffPicker";
import { previewFontUrls } from "../../lib/fonts";

/** Inject @font-face rules for Inter and Lora into a <style> tag once */
function usePreviewFonts() {
  useEffect(() => {
    const id = "gop-preview-fonts";
    if (document.getElementById(id)) return;
    const style = document.createElement("style");
    style.id = id;
    style.textContent = `
      @font-face { font-family: 'Inter'; font-weight: 400; src: url('${previewFontUrls.Inter.regular}') format('truetype'); }
      @font-face { font-family: 'Inter'; font-weight: 700; src: url('${previewFontUrls.Inter.bold}') format('truetype'); }
      @font-face { font-family: 'Lora'; font-weight: 400; src: url('${previewFontUrls.Lora.regular}') format('truetype'); }
      @font-face { font-family: 'Lora'; font-weight: 700; src: url('${previewFontUrls.Lora.bold}') format('truetype'); }
    `;
    document.head.appendChild(style);
  }, []);
}

const FONT_FAMILY_CSS: Record<string, string> = {
  Roboto: "'Roboto', sans-serif",
  Inter: "'Inter', sans-serif",
  Lora: "'Lora', serif",
};

export function CVPreview() {
  const cv = useCVStore((s) => s.activeCv());
  const workspace = useCVStore((s) => s.workspace);
  const setActiveCV = useCVStore((s) => s.setActiveCV);
  const [diffOpen, setDiffOpen] = useState(false);
  usePreviewFonts();
  if (!cv) return null;

  const visibleSections = cv.sections.filter((s) => s.visible);
  const parentName = cv.parentId ? workspace.cvs[cv.parentId]?.name : null;
  const fontFamily = FONT_FAMILY_CSS[cv.settings?.fontFamily ?? "Roboto"] ?? FONT_FAMILY_CSS.Roboto;

  return (
    <div className="flex flex-col items-center p-8 min-h-full">
      {/* CV name badge + fork indicator */}
      <div className="w-full max-w-[210mm] mb-2 flex items-center gap-2 text-xs text-light">
        <span className="font-medium text-muted">{cv.name}</span>
        {parentName && cv.parentId && (
          <>
            <button
              className="hover:text-accent transition-colors"
              onClick={() => setActiveCV(cv.parentId!)}
            >
              <CornerDownRight size={12} className="inline mr-0.5" /> <Trans>forked from {parentName}</Trans>
            </button>
            <button
              className="text-accent hover:text-accent/80 transition-colors"
              onClick={() => setDiffOpen(true)}
            >
              <Trans>Compare with parent</Trans>
            </button>
          </>
        )}
      </div>

      <div
        className="w-full max-w-[210mm] min-h-[297mm] bg-page shadow-sm rounded px-12.5 py-10"
        style={{ fontFamily }}
      >
        <PreviewMeta meta={cv.meta} />
        {visibleSections.map((section) => (
          <PreviewSection key={section.id} section={section} />
        ))}
      </div>

      {diffOpen && cv.parentId && (
        <DiffPicker
          onClose={() => setDiffOpen(false)}
          initialBaseId={cv.parentId}
          initialAgainstId={cv.id}
        />
      )}
    </div>
  );
}
