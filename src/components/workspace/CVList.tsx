import { useCVStore } from "../../store/cvStore";
import { CVListItem } from "./CVListItem";

interface CVListProps {
  onClose: () => void;
  onNewCV: () => void;
}

export function CVList({ onClose, onNewCV }: CVListProps) {
  const workspace = useCVStore((s) => s.workspace);
  const setActiveCV = useCVStore((s) => s.setActiveCV);
  const forkCV = useCVStore((s) => s.forkCV);

  const orderedCvs = workspace.order
    .map((id) => workspace.cvs[id])
    .filter(Boolean);

  const activeCvId = workspace.activeCvId;
  const activeCvName = activeCvId ? workspace.cvs[activeCvId]?.name : null;

  return (
    <div className="absolute left-0 top-full mt-1 w-80 bg-white border border-gray-200 rounded-lg shadow-lg z-50">
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
          + New blank CV
        </button>
        {activeCvId && (
          <button
            className="flex-1 text-xs text-accent hover:text-primary transition-colors py-1.5 rounded hover:bg-gray-50"
            onClick={() => {
              forkCV(activeCvId, `${activeCvName ?? "CV"} (fork)`);
              onClose();
            }}
          >
            ⎇ Fork active CV
          </button>
        )}
      </div>
    </div>
  );
}
