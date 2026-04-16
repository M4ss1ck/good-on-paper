import { useState, useRef, useEffect } from "react";
import { t } from "@lingui/core/macro";
import { useCVStore } from "../../store/cvStore";
import { CVList } from "./CVList";
import { NewCVDialog } from "./NewCVDialog";

export function CVSwitcher() {
  const activeCvRawName = useCVStore(
    (s) =>
      s.workspace.activeCvId
        ? s.workspace.cvs[s.workspace.activeCvId]?.name ?? null
        : null,
  );
  const hasActiveCv = useCVStore((s) => !!s.workspace.activeCvId);
  const activeCvName = activeCvRawName ?? (hasActiveCv ? t`Untitled` : t`No CV`);

  const [listOpen, setListOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!listOpen) return;
    const handle = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setListOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [listOpen]);

  // Cmd/Ctrl+K toggles CV switcher
  useEffect(() => {
    const handle = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setListOpen((v) => !v);
      }
    };
    document.addEventListener("keydown", handle);
    return () => document.removeEventListener("keydown", handle);
  }, []);

  return (
    <>
      <div className="relative" ref={containerRef}>
        <button
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-primary rounded border border-gray-200 hover:border-accent transition-colors max-w-48"
          onClick={() => setListOpen((v) => !v)}
        >
          <span className="truncate">{activeCvName}</span>
          <svg
            className={`w-3.5 h-3.5 shrink-0 transition-transform ${listOpen ? "rotate-180" : ""}`}
            viewBox="0 0 20 20"
            fill="currentColor"
          >
            <path
              fillRule="evenodd"
              d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z"
              clipRule="evenodd"
            />
          </svg>
        </button>
        {listOpen && (
          <CVList
            onClose={() => setListOpen(false)}
            onNewCV={() => setDialogOpen(true)}
          />
        )}
      </div>

      {dialogOpen && <NewCVDialog onClose={() => setDialogOpen(false)} />}
    </>
  );
}
