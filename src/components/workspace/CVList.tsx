import { GitFork } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { useCVStore } from "../../store/cvStore";
import { getWorkspaceSize } from "../../lib/storage";
import { CVListItem } from "./CVListItem";

interface CVListProps {
  onClose: () => void;
  onNewCV: () => void;
}

const TWO_MB = 2 * 1024 * 1024;

export function CVList({ onClose, onNewCV }: CVListProps) {
  const workspace = useCVStore((s) => s.workspace);
  const setActiveCV = useCVStore((s) => s.setActiveCV);
  const forkCV = useCVStore((s) => s.forkCV);

  const orderedCvs = workspace.order
    .map((id) => workspace.cvs[id])
    .filter(Boolean);

  const activeCvId = workspace.activeCvId;
  const activeCvName = activeCvId ? workspace.cvs[activeCvId]?.name : null;
  const isLarge = getWorkspaceSize() > TWO_MB;

  return (
    <div className="absolute left-0 top-full mt-1 w-[calc(100vw-1.5rem)] sm:w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
      {isLarge && (
        <div className="px-3 py-1.5 bg-amber-50 border-b border-amber-200 text-xs text-amber-700">
          <Trans>You have a lot of saved CVs. Consider deleting old ones to keep things fast.</Trans>
        </div>
      )}
      <div className="max-h-80 overflow-y-auto divide-y divide-gray-100">
        {orderedCvs.map((cv) => (
          <CVListItem
            key={cv.id}
            cv={cv}
            isActive={cv.id === activeCvId}
            onSelect={() => setActiveCV(cv.id)}
            onClose={onClose}
          />
        ))}
      </div>
      <div className="border-t border-gray-200 p-2 flex gap-2">
        <button
          className="flex-1 text-xs text-accent hover:text-primary transition-colors py-1.5 rounded hover:bg-gray-50"
          onClick={() => {
            onNewCV();
            onClose();
          }}
        >
          <Trans>+ New blank CV</Trans>
        </button>
        {activeCvId && (
          <button
            className="flex-1 text-xs text-accent hover:text-primary transition-colors py-1.5 rounded hover:bg-gray-50"
            onClick={() => {
              forkCV(activeCvId, `${activeCvName ?? "CV"} (fork)`);
              onClose();
            }}
          >
            <GitFork size={12} className="inline mr-0.5" /> <Trans>Fork active CV</Trans>
          </button>
        )}
      </div>
    </div>
  );
}
