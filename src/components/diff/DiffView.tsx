import { useMemo } from "react";
import { X } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import type { CV } from "../../types/cv";
import { computeDiff } from "../../lib/diff/structuralDiff";
import { MetaDiff } from "./MetaDiff";
import { SectionDiff } from "./SectionDiff";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface DiffViewProps {
  base: CV;
  against: CV;
  onClose: () => void;
}

export function DiffView({ base, against, onClose }: DiffViewProps) {
  const diff = useMemo(() => computeDiff(base, against), [base, against]);
  const trapRef = useFocusTrap<HTMLDivElement>(onClose);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="diff-view-title"
        className="bg-white rounded-lg shadow-lg w-[95vw] sm:w-[90vw] max-w-3xl max-h-[90dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="diff-view-title" className="text-sm font-medium text-primary">
            {base.name} → {against.name}
          </h2>
          <button
            onClick={onClose}
            aria-label={t`Close`}
            className="text-light hover:text-muted transition-colors text-lg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {diff.unchanged ? (
            <p className="text-sm text-muted text-center py-8">
              <Trans>These two CVs are identical.</Trans>
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
