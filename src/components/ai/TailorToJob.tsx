import { useState } from "react";
import { Target, Check, X } from "lucide-react";
import { useCVStore } from "../../store/cvStore";
import { useAIAction } from "../../hooks/useAIAction";
import {
  tailorToJobPrompt,
  type TailorSuggestion,
} from "../../lib/ai/prompts";
import type {
  SummaryItem,
  ExperienceItem,
} from "../../types/cv";

type SuggestionStatus = "pending" | "accepted" | "dismissed";

interface TrackedSuggestion extends TailorSuggestion {
  status: SuggestionStatus;
}

interface TailorToJobProps {
  open: boolean;
  onClose: () => void;
}

function stripMarkdownFences(text: string): string {
  return text.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "");
}

function parseSuggestions(raw: string): TrackedSuggestion[] | null {
  const cleaned = stripMarkdownFences(raw.trim());
  try {
    const parsed = JSON.parse(cleaned) as { suggestions?: TailorSuggestion[] };
    if (Array.isArray(parsed.suggestions)) {
      return parsed.suggestions.map((s) => ({ ...s, status: "pending" as const }));
    }
    return null;
  } catch {
    return null;
  }
}

export function TailorToJob({ open, onClose }: TailorToJobProps) {
  const cv = useCVStore((s) => s.activeCv());
  const updateItem = useCVStore((s) => s.updateItem);
  const updateBullet = useCVStore((s) => s.updateBullet);
  const { run, state, error, reset } = useAIAction();

  const [jobDescription, setJobDescription] = useState("");
  const [suggestions, setSuggestions] = useState<TrackedSuggestion[] | null>(null);
  const [rawFallback, setRawFallback] = useState<string | null>(null);

  const handleClose = () => {
    onClose();
  };

  const handleTailor = async () => {
    if (!cv) return;
    setSuggestions(null);
    setRawFallback(null);
    reset();

    const messages = tailorToJobPrompt(cv, jobDescription);
    const result = await run(messages);
    if (!result) return;

    const parsed = parseSuggestions(result);
    if (parsed) {
      setSuggestions(parsed);
    } else {
      setRawFallback(result);
    }
  };

  const handleAccept = (index: number) => {
    if (!suggestions) return;
    if (!cv) return;
    const s = suggestions[index];

    // Try to find the matching section and apply the change
    const sectionLower = s.section.toLowerCase();
    for (const section of cv.sections) {
      const titleMatch = section.title.toLowerCase().includes(sectionLower) ||
        section.type === sectionLower;
      if (!titleMatch) continue;

      if (section.type === "summary" && section.items.length > 0) {
        const item = section.items[0] as SummaryItem;
        updateItem(section.id, item.id, { content: s.suggested });
        break;
      }

      if (section.type === "experience") {
        // Try to match by current text in bullets
        if (s.current) {
          for (const item of section.items) {
            const exp = item as ExperienceItem;
            const bulletIdx = exp.bullets.findIndex(
              (b) => b === s.current || b.includes(s.current!),
            );
            if (bulletIdx !== -1) {
              updateBullet(section.id, exp.id, bulletIdx, s.suggested);
              break;
            }
          }
        }
        break;
      }

      // For other section types, try matching the first item
      if (section.items.length > 0) {
        const item = section.items[0];
        if ("content" in item) {
          updateItem(section.id, item.id, { content: s.suggested });
        }
        break;
      }
    }

    setSuggestions(
      suggestions.map((item, i) =>
        i === index ? { ...item, status: "accepted" } : item,
      ),
    );
  };

  const handleDismiss = (index: number) => {
    if (!suggestions) return;
    setSuggestions(
      suggestions.map((item, i) =>
        i === index ? { ...item, status: "dismissed" } : item,
      ),
    );
  };

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
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-primary">
            <Target size={18} className="inline mr-1.5" />Tailor to Job Description
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {/* Job description input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Paste the job description
            </label>
            <textarea
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              disabled={state === "loading"}
              placeholder="Paste the full job description here..."
              className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-y min-h-32 disabled:opacity-60 disabled:bg-gray-50"
              rows={6}
            />
          </div>

          <button
            onClick={handleTailor}
            disabled={!jobDescription.trim() || state === "loading"}
            className="px-4 py-2 text-sm rounded bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
          >
            {state === "loading" ? (
              <>
                <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Tailoring...
              </>
            ) : (
              "Tailor my CV"
            )}
          </button>

          {/* Error */}
          {state === "error" && error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
              {error}
            </div>
          )}

          {/* Raw fallback */}
          {rawFallback && (
            <div className="space-y-2">
              <p className="text-xs text-amber-600 font-medium">
                Couldn't parse structured suggestions. Showing raw response:
              </p>
              <div className="p-3 text-sm text-primary bg-gray-50 border border-gray-200 rounded whitespace-pre-wrap">
                {rawFallback}
              </div>
            </div>
          )}

          {/* Parsed suggestions */}
          {suggestions && suggestions.length > 0 && (
            <div className="space-y-3">
              <p className="text-xs text-muted">
                {suggestions.filter((s) => s.status === "pending").length} suggestion
                {suggestions.filter((s) => s.status === "pending").length === 1 ? "" : "s"} remaining
              </p>
              {suggestions.map((s, i) => (
                <SuggestionCard
                  key={i}
                  suggestion={s}
                  onAccept={() => handleAccept(i)}
                  onDismiss={() => handleDismiss(i)}
                />
              ))}
            </div>
          )}

          {suggestions && suggestions.length === 0 && (
            <p className="text-sm text-muted py-4 text-center">
              No suggestions generated. The CV may already be well-aligned.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-gray-200">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm rounded border border-gray-200 text-muted hover:text-primary transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function SuggestionCard({
  suggestion,
  onAccept,
  onDismiss,
}: {
  suggestion: TrackedSuggestion;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  if (suggestion.status === "accepted") {
    return (
      <div className="p-3 rounded border border-green-200 bg-green-50/50 opacity-70">
        <div className="flex items-center gap-2 text-xs text-green-700">
          <Check size={14} />
          <span className="font-medium capitalize">{suggestion.section}</span>
          <span>— Applied</span>
        </div>
      </div>
    );
  }

  if (suggestion.status === "dismissed") {
    return (
      <div className="p-3 rounded border border-gray-200 bg-gray-50 opacity-50">
        <div className="flex items-center gap-2 text-xs text-muted">
          <X size={14} />
          <span className="font-medium capitalize">{suggestion.section}</span>
          <span>— Dismissed</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded border border-accent/30 bg-accent/5 space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-xs font-semibold text-accent uppercase tracking-wide">
          {suggestion.section}
        </span>
        <span className="text-xs text-muted capitalize">({suggestion.action})</span>
      </div>

      <p className="text-xs text-muted">{suggestion.reason}</p>

      {suggestion.current && (
        <div className="text-sm">
          <p className="text-xs font-medium text-gray-500 mb-0.5">Current:</p>
          <p className="text-primary/60 line-through">{suggestion.current}</p>
        </div>
      )}

      <div className="text-sm">
        <p className="text-xs font-medium text-gray-500 mb-0.5">Suggested:</p>
        <p className="text-primary">{suggestion.suggested}</p>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          onClick={onAccept}
          className="px-3 py-1 text-xs rounded bg-accent text-white hover:bg-accent/90 transition-colors"
        >
          Accept
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1 text-xs rounded border border-gray-200 text-muted hover:text-primary transition-colors"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
