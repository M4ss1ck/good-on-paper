import { useState } from "react";
import { useCVStore } from "../../store/cvStore";
import { useAIStore } from "../../store/aiStore";
import { useAIAction } from "../../hooks/useAIAction";
import { generateSummaryPrompt } from "../../lib/ai/prompts";
import { AIActionButton } from "./AIActionButton";
import { AISuggestion } from "./AISuggestion";

interface GenerateSummaryProps {
  sectionId: string;
  itemId: string;
}

export function GenerateSummary({ sectionId, itemId }: GenerateSummaryProps) {
  const cv = useCVStore((s) => s.activeCv());
  const updateItem = useCVStore((s) => s.updateItem);
  const hasProvider = useAIStore((s) => s.settings.provider !== null);
  const { run, state, error, reset } = useAIAction();
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!cv) return;
    setSuggestion(null);
    reset();
    const messages = generateSummaryPrompt(cv);
    const result = await run(messages);
    if (result) setSuggestion(result);
  };

  const handleAccept = (text: string) => {
    updateItem(sectionId, itemId, { content: text });
    setSuggestion(null);
  };

  const handleDismiss = () => {
    setSuggestion(null);
  };

  return (
    <div>
      {hasProvider ? (
        <AIActionButton
          onClick={handleGenerate}
          state={state}
          error={error}
          label="Generate from my experience"
        />
      ) : (
        <button
          onClick={() => useAIStore.getState().setSettingsOpen(true)}
          className="text-xs text-accent hover:underline"
        >
          Configure AI to generate a summary →
        </button>
      )}
      {suggestion && (
        <AISuggestion
          suggestion={suggestion}
          onAccept={handleAccept}
          onDismiss={handleDismiss}
        />
      )}
    </div>
  );
}
