import { useState, useMemo } from "react";
import { Search, CircleCheck, X } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { useCVStore } from "../../store/cvStore";
import { useUIStore } from "../../store/uiStore";
import { detectAIPhrases, type AIFlag } from "../../lib/ai/detectAI";

interface DetectAITextProps {
  open: boolean;
  onClose: () => void;
}

export function DetectAIText({ open, onClose }: DetectAITextProps) {
  const cv = useCVStore((s) => s.activeCv());
  const setActiveSection = useUIStore((s) => s.setActiveSection);
  const [scanCount, setScanCount] = useState(0);

  const flags = useMemo(() => {
    if (!open || !cv) return [];
    return detectAIPhrases(cv);
  }, [open, cv, scanCount]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRun = () => setScanCount((c) => c + 1);

  const handleClose = () => {
    onClose();
  };

  const handleFlagClick = (flag: AIFlag) => {
    setActiveSection(flag.sectionId);
    // Small delay to let the section expand, then scroll to it
    setTimeout(() => {
      const el = document.querySelector(
        `[data-section-id="${flag.sectionId}"]`,
      );
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 100);
  };

  // Group flags by section title (first segment of location)
  const grouped = flags.reduce<Record<string, AIFlag[]>>((acc, flag) => {
    const section = flag.location.split(" > ")[0];
    if (!acc[section]) acc[section] = [];
    acc[section].push(flag);
    return acc;
  }, {});

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") handleClose();
      }}
    >
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-primary">
            <Search size={18} className="inline mr-1.5" /><Trans>AI Phrase Check</Trans>
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1">
          {flags.length === 0 ? (
            <div className="text-center py-8">
              <div className="flex justify-center text-green-500 mb-2"><CircleCheck size={28} /></div>
              <p className="text-sm font-medium text-primary">
                <Trans>Looks good!</Trans>
              </p>
              <p className="text-xs text-muted mt-1">
                <Trans>No AI-sounding phrases detected.</Trans>
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <p className="text-xs text-muted">
                <Trans>
                  Found {flags.length} phrase{flags.length === 1 ? "" : "s"}{" "}
                  a recruiter might notice. Click a flag to jump to it.
                </Trans>
              </p>
              {Object.entries(grouped).map(([section, sectionFlags]) => (
                <div key={section}>
                  <h3 className="text-xs font-semibold text-primary mb-2 uppercase tracking-wide">
                    {section}
                  </h3>
                  <ul className="space-y-2">
                    {sectionFlags.map((flag, i) => (
                      <li
                        key={`${flag.location}-${flag.phrase}-${i}`}
                        className="p-2.5 rounded border border-amber-200 bg-amber-50/50 cursor-pointer hover:border-amber-300 transition-colors"
                        onClick={() => handleFlagClick(flag)}
                      >
                        <div className="flex items-baseline gap-2">
                          <span className="text-sm font-medium text-amber-700">
                            "{flag.phrase}"
                          </span>
                        </div>
                        <p className="text-xs text-muted mt-0.5">
                          {flag.location}
                        </p>
                        <p className="text-xs text-amber-600 mt-1">
                          {flag.reason}
                        </p>
                        {flag.suggestion && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            Try: {flag.suggestion}
                          </p>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between items-center px-6 py-3 border-t border-gray-200">
          <button
            onClick={handleRun}
            className="px-3 py-1.5 text-xs rounded border border-gray-200 text-muted hover:text-primary hover:border-accent transition-colors"
          >
            <Trans>Re-scan</Trans>
          </button>
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm rounded border border-gray-200 text-muted hover:text-primary transition-colors"
          >
            <Trans>Close</Trans>
          </button>
        </div>
      </div>
    </div>
  );
}
