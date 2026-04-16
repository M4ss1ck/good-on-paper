import { useEffect, useRef } from "react";
import { Sparkles } from "lucide-react";
import { Trans } from "@lingui/react/macro";

interface AISuggestionProps {
  suggestion: string;
  onAccept: (text: string) => void;
  onDismiss: () => void;
}

export function AISuggestion({
  suggestion,
  onAccept,
  onDismiss,
}: AISuggestionProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onDismiss();
    };
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onDismiss]);

  return (
    <div
      ref={ref}
      className="mt-2 p-3 border border-accent/30 bg-accent/5 rounded-lg"
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-accent mb-2">
        <Sparkles size={14} /> <Trans>AI Suggestion</Trans>
      </div>
      <p className="text-sm text-primary whitespace-pre-wrap mb-3">
        {suggestion}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => onAccept(suggestion)}
          className="px-3 py-1 text-xs rounded bg-accent text-white hover:bg-accent/90 transition-colors"
        >
          <Trans>Accept</Trans>
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1 text-xs rounded border border-gray-200 text-muted hover:text-primary transition-colors"
        >
          <Trans>Dismiss</Trans>
        </button>
      </div>
    </div>
  );
}
