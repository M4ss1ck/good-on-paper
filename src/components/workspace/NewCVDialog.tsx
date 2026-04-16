import { useState } from "react";
import { useCVStore } from "../../store/cvStore";

interface NewCVDialogProps {
  onClose: () => void;
}

type Tab = "blank" | "fork";

export function NewCVDialog({ onClose }: NewCVDialogProps) {
  const workspace = useCVStore((s) => s.workspace);
  const createCV = useCVStore((s) => s.createCV);
  const forkCV = useCVStore((s) => s.forkCV);

  const [tab, setTab] = useState<Tab>("blank");
  const [name, setName] = useState("");
  const [sourceId, setSourceId] = useState(workspace.activeCvId ?? "");

  const orderedCvs = workspace.order
    .map((id) => workspace.cvs[id])
    .filter(Boolean);

  const handleCreate = () => {
    const trimmed = name.trim();
    if (!trimmed) return;

    if (tab === "blank") {
      createCV(trimmed);
    } else {
      if (!sourceId) return;
      forkCV(sourceId, trimmed);
    }
    onClose();
  };

  const tabClass = (t: Tab) =>
    `flex-1 py-2 text-sm font-medium text-center rounded-t transition-colors ${tab === t
      ? "text-primary border-b-2 border-accent"
      : "text-light hover:text-muted"
    }`;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-lg shadow-lg w-96 max-w-[90vw]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button className={tabClass("blank")} onClick={() => setTab("blank")}>
            Blank CV
          </button>
          <button className={tabClass("fork")} onClick={() => setTab("fork")}>
            Fork existing
          </button>
        </div>

        <div className="p-5 space-y-4">
          {tab === "fork" && (
            <div>
              <label className="block text-xs font-medium text-muted mb-1">
                Source CV
              </label>
              <select
                className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
                value={sourceId}
                onChange={(e) => {
                  setSourceId(e.target.value);
                  if (!name) {
                    const src = workspace.cvs[e.target.value];
                    if (src) setName(`${src.name} (fork)`);
                  }
                }}
              >
                <option value="" disabled>
                  Select a CV…
                </option>
                {orderedCvs.map((cv) => (
                  <option key={cv.id} value={cv.id}>
                    {cv.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-muted mb-1">
              Name
            </label>
            <input
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:border-accent transition-colors"
              placeholder={tab === "blank" ? "My new CV" : "Fork name"}
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCreate();
              }}
              autoFocus
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <button
              className="px-3 py-1.5 text-sm rounded border border-gray-200 text-muted hover:text-primary transition-colors"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-3 py-1.5 text-sm rounded bg-accent text-white hover:bg-primary transition-colors disabled:opacity-50"
              disabled={!name.trim() || (tab === "fork" && !sourceId)}
              onClick={handleCreate}
            >
              {tab === "blank" ? "Create" : "Fork"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
