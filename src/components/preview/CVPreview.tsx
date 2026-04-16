import { useCVStore } from "../../store/cvStore";
import { PreviewMeta } from "./PreviewMeta";
import { PreviewSection } from "./PreviewSection";

export function CVPreview() {
  const cv = useCVStore((s) => s.activeCv());
  if (!cv) return null;
  const visibleSections = cv.sections.filter((s) => s.visible);

  return (
    <div className="flex items-start justify-center p-8 min-h-full">
      <div className="w-full max-w-[210mm] min-h-[297mm] bg-page shadow-sm rounded px-12.5 py-10">
        <PreviewMeta meta={cv.meta} />
        {visibleSections.map((section) => (
          <PreviewSection key={section.id} section={section} />
        ))}
      </div>
    </div>
  );
}
