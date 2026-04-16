import { useState } from "react";
import { CornerDownRight } from "lucide-react";
import { useCVStore } from "../../store/cvStore";
import { PreviewMeta } from "./PreviewMeta";
import { PreviewSection } from "./PreviewSection";
import { DiffPicker } from "../diff/DiffPicker";

export function CVPreview() {
  const cv = useCVStore((s) => s.activeCv());
  const workspace = useCVStore((s) => s.workspace);
  const setActiveCV = useCVStore((s) => s.setActiveCV);
  const [diffOpen, setDiffOpen] = useState(false);
  if (!cv) return null;

  const visibleSections = cv.sections.filter((s) => s.visible);
  const parentName = cv.parentId ? workspace.cvs[cv.parentId]?.name : null;

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
              <CornerDownRight size={12} className="inline mr-0.5" /> forked from {parentName}
            </button>
            <button
              className="text-accent hover:text-accent/80 transition-colors"
              onClick={() => setDiffOpen(true)}
            >
              Compare with parent
            </button>
          </>
        )}
      </div>

      <div className="w-full max-w-[210mm] min-h-[297mm] bg-page shadow-sm rounded px-12.5 py-10">
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
