import { useState } from "react";
import { X } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useCVStore } from "../../store/cvStore";
import { DiffView } from "./DiffView";
import { useFocusTrap } from "../../hooks/useFocusTrap";

interface DiffPickerProps {
  onClose: () => void;
  initialBaseId?: string;
  initialAgainstId?: string;
}

export function DiffPicker({ onClose, initialBaseId, initialAgainstId }: DiffPickerProps) {
  const workspace = useCVStore((s) => s.workspace);
  const orderedCvs = workspace.order.map((id) => workspace.cvs[id]).filter(Boolean);

  const [baseId, setBaseId] = useState(initialBaseId ?? "");
  const [againstId, setAgainstId] = useState(initialAgainstId ?? "");
  const [comparing, setComparing] = useState(
    !!(initialBaseId && initialAgainstId),
  );

  const baseCv = baseId ? workspace.cvs[baseId] : undefined;
  const againstCv = againstId ? workspace.cvs[againstId] : undefined;
  const canCompare = baseId && againstId && baseId !== againstId;
  const trapRef = useFocusTrap<HTMLDivElement>(onClose);

  if (comparing && baseCv && againstCv) {
    return (
      <DiffView
        base={baseCv}
        against={againstCv}
        onClose={onClose}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="diff-picker-title"
        className="bg-white rounded-lg shadow-lg w-96 max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="diff-picker-title" className="text-sm font-medium text-primary"><Trans>Compare CVs</Trans></h2>
          <button
            onClick={onClose}
            aria-label={t`Close`}
            className="text-light hover:text-muted transition-colors text-lg"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted mb-1"><Trans>Base</Trans></label>
            <select
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              value={baseId}
              onChange={(e) => setBaseId(e.target.value)}
            >
              <option value="" disabled>{t`Select a CV…`}</option>
              {orderedCvs.map((cv) => (
                <option key={cv.id} value={cv.id}>{cv.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-muted mb-1"><Trans>Against</Trans></label>
            <select
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              value={againstId}
              onChange={(e) => setAgainstId(e.target.value)}
            >
              <option value="" disabled>{t`Select a CV…`}</option>
              {orderedCvs.map((cv) => (
                <option key={cv.id} value={cv.id}>{cv.name}</option>
              ))}
            </select>
          </div>

          {baseId && againstId && baseId === againstId && (
            <p className="text-xs text-amber-600"><Trans>Select two different CVs to compare.</Trans></p>
          )}

          <div className="flex justify-end gap-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 text-sm rounded border border-gray-200 text-muted hover:text-primary transition-colors"
            >
              <Trans>Cancel</Trans>
            </button>
            <button
              disabled={!canCompare}
              onClick={() => setComparing(true)}
              className="px-3 py-1.5 text-sm rounded bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Trans>Compare</Trans>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
