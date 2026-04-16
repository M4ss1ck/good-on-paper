import { useMemo } from "react";
import type { CV } from "../../types/cv";
import { computeDiff } from "../../lib/diff/structuralDiff";
import { MetaDiff } from "./MetaDiff";
import { SectionDiff } from "./SectionDiff";

interface DiffViewProps {
  base: CV;
  against: CV;
  onClose: () => void;
}

export function DiffView({ base, against, onClose }: DiffViewProps) {
  const diff = useMemo(() => computeDiff(base, against), [base, against]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-[90vw] max-w-3xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <span className="text-sm font-medium text-primary">
            {base.name} → {against.name}
          </span>
          <button
            onClick={onClose}
            className="text-light hover:text-muted transition-colors text-lg"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {diff.unchanged ? (
            <p className="text-sm text-muted text-center py-8">
              These two CVs are identical.
            </p>
          ) : (
            <>
              <MetaDiff diff={diff.meta} />

              {diff.sections.map((sec) => (
                <SectionDiff key={sec.sectionId} diff={sec} />
              ))}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
