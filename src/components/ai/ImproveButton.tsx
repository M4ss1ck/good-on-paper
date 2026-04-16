import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useAIStore } from "../../store/aiStore";
import { useAIAction } from "../../hooks/useAIAction";
import { improveBulletPrompt } from "../../lib/ai/prompts";
import { AISuggestion } from "./AISuggestion";

interface ImproveButtonProps {
  bullet: string;
  role: string;
  company: string;
  onAccept: (text: string) => void;
}

export function ImproveButton({
  bullet,
  role,
  company,
  onAccept,
}: ImproveButtonProps) {
  const hasProvider = useAIStore((s) => s.settings.provider !== null);
  const { run, state, error, reset } = useAIAction();
  const [suggestion, setSuggestion] = useState<string | null>(null);

  const handleClick = async () => {
    if (!bullet.trim()) return;
    setSuggestion(null);
    reset();
    const messages = improveBulletPrompt(bullet, role, company);
    const result = await run(messages);
    if (result) setSuggestion(result);
  };

  const handleAccept = (text: string) => {
    onAccept(text);
    setSuggestion(null);
  };

  const handleDismiss = () => {
    setSuggestion(null);
  };

  const isLoading = state === "loading";
  const disabled = !bullet.trim();

  if (!hasProvider) {
    return (
      <button
        onClick={() => useAIStore.getState().setSettingsOpen(true)}
        className="text-xs text-accent hover:underline shrink-0"
        title="Configure AI to improve bullets"
      >
        <Sparkles size={14} />
      </button>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleClick}
        disabled={disabled || isLoading}
        title={
          !bullet.trim()
            ? "Write a bullet first"
            : "Improve this bullet"
        }
        className="text-muted hover:text-accent transition-colors text-sm shrink-0 disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-gray-300 border-t-accent rounded-full animate-spin" />
        ) : (
          <Sparkles size={14} />
        )}
      </button>
      {state === "error" && error && (
        <div className="absolute top-full right-0 mt-1 px-2 py-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded shadow-sm whitespace-nowrap z-10">
          {error}
        </div>
      )}
      {suggestion && (
        <div className="absolute top-full left-0 right-0 mt-1 z-10 min-w-64">
          <AISuggestion
            suggestion={suggestion}
            onAccept={handleAccept}
            onDismiss={handleDismiss}
          />
        </div>
      )}
    </div>
  );
}
