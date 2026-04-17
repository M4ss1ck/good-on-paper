import { useState, useEffect, useRef, useCallback } from "react";
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

/** A4 width in px (210mm at 96dpi ≈ 793.7px) */
const A4_WIDTH_PX = 793.7;

/** Compute scale factor so the A4 page fits inside the container */
function usePreviewScale() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  const recalc = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const available = el.clientWidth;
    setScale(available < A4_WIDTH_PX ? available / A4_WIDTH_PX : 1);
  }, []);

  useEffect(() => {
    recalc();
    const observer = new ResizeObserver(recalc);
    if (containerRef.current) observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [recalc]);

  return { containerRef, scale };
}

export function CVPreview() {
  const cv = useCVStore((s) => s.activeCv());
  const workspace = useCVStore((s) => s.workspace);
  const setActiveCV = useCVStore((s) => s.setActiveCV);
  const [diffOpen, setDiffOpen] = useState(false);
  const { containerRef, scale } = usePreviewScale();
  usePreviewFonts();
  if (!cv) return null;

  const visibleSections = cv.sections.filter((s) => s.visible);
  const parentName = cv.parentId ? workspace.cvs[cv.parentId]?.name : null;
  const fontFamily = FONT_FAMILY_CSS[cv.settings?.fontFamily ?? "Roboto"] ?? FONT_FAMILY_CSS.Roboto;

  return (
    <div ref={containerRef} className="flex flex-col items-center p-4 md:p-8 min-h-full">
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
        className="bg-page shadow-sm rounded px-12.5 py-10 origin-top"
        style={{
          fontFamily,
          width: `${A4_WIDTH_PX}px`,
          minHeight: "297mm",
          transform: scale < 1 ? `scale(${scale})` : undefined,
        }}
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
