import { useState, useRef, useEffect } from "react";
import { Pencil, Copy, GitFork, Trash2 } from "lucide-react";
import { useCVStore } from "../../store/cvStore";
import { relativeTime } from "../../lib/relativeTime";
import type { CV } from "../../types/cv";

interface CVListItemProps {
  cv: CV;
  isActive: boolean;
  onSelect: () => void;
  onClose: () => void;
}

export function CVListItem({ cv, isActive, onSelect, onClose }: CVListItemProps) {
  const workspace = useCVStore((s) => s.workspace);
  const renameCV = useCVStore((s) => s.renameCV);
  const duplicateCV = useCVStore((s) => s.duplicateCV);
  const forkCV = useCVStore((s) => s.forkCV);
  const deleteCV = useCVStore((s) => s.deleteCV);

  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(cv.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const parentName = cv.parentId ? workspace.cvs[cv.parentId]?.name : null;
  const isLastCV = workspace.order.length <= 1;

  // Count forks of this CV
  const forkCount = Object.values(workspace.cvs).filter(
    (c) => c.parentId === cv.id,
  ).length;

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const handleRename = () => {
    const trimmed = editName.trim();
    if (trimmed && trimmed !== cv.name) {
      renameCV(cv.id, trimmed);
    }
    setEditing(false);
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    deleteCV(cv.id);
    setConfirmDelete(false);
  };

  return (
    <div
      className={`group px-3 py-2 cursor-pointer transition-colors ${isActive ? "bg-blue-50" : "hover:bg-gray-50"
        }`}
      onClick={() => {
        if (!editing) {
          onSelect();
          onClose();
        }
      }}
    >
      <div className="flex items-center gap-2 min-w-0">
        {editing ? (
          <input
            ref={inputRef}
            className="flex-1 text-sm border-b border-accent px-1 py-0.5 bg-transparent focus:outline-none min-w-0"
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRename();
              if (e.key === "Escape") setEditing(false);
            }}
            onClick={(e) => e.stopPropagation()}
          />
        ) : (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-primary truncate">
              {cv.name}
              {isActive && (
                <span className="ml-1.5 text-[10px] font-normal text-accent">
                  active
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 text-[11px] text-light">
              <span>{relativeTime(cv.updatedAt)}</span>
              {parentName && (
                <span className="truncate">↳ forked from {parentName}</span>
              )}
            </div>
          </div>
        )}

        {/* Action buttons — visible on hover */}
        <div
          className="hidden group-hover:flex items-center gap-0.5 shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            className="p-1 text-xs text-light hover:text-primary transition-colors"
            title="Rename"
            onClick={() => {
              setEditName(cv.name);
              setEditing(true);
            }}
          >
            <Pencil size={14} />
          </button>
          <button
            className="p-1 text-xs text-light hover:text-primary transition-colors"
            title="Duplicate"
            onClick={() => {
              duplicateCV(cv.id, `${cv.name} (copy)`);
              onClose();
            }}
          >
            <Copy size={14} />
          </button>
          <button
            className="p-1 text-xs text-light hover:text-primary transition-colors"
            title="Fork"
            onClick={() => {
              forkCV(cv.id, `${cv.name} (fork)`);
              onClose();
            }}
          >
            <GitFork size={14} />
          </button>
          {!isLastCV && (
            <button
              className="p-1 text-xs text-light hover:text-red-500 transition-colors"
              title="Delete"
              onClick={handleDelete}
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div
          className="mt-1.5 p-2 bg-red-50 border border-red-200 rounded text-xs"
          onClick={(e) => e.stopPropagation()}
        >
          <p className="text-red-700 mb-1.5">
            Delete &ldquo;{cv.name}&rdquo;?
            {forkCount > 0 && (
              <span className="block mt-0.5 text-red-600">
                This CV has {forkCount} fork{forkCount > 1 ? "s" : ""}. Deleting
                will unlink them.
              </span>
            )}
          </p>
          <div className="flex gap-1.5">
            <button
              className="px-2 py-0.5 rounded bg-red-500 text-white hover:bg-red-600 transition-colors"
              onClick={handleDelete}
            >
              Delete
            </button>
            <button
              className="px-2 py-0.5 rounded border border-gray-200 text-muted hover:text-primary transition-colors"
              onClick={() => setConfirmDelete(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
