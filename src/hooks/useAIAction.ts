import { useState } from "react";
import type { AIActionState } from "../types/ai";
import { useAIStore } from "../store/aiStore";
import { callAI } from "../lib/ai/provider";

export function useAIAction() {
  const [state, setState] = useState<AIActionState>("idle");
  const [error, setError] = useState<string | null>(null);
  const settings = useAIStore((s) => s.settings);

  const run = async (
    messages: { role: string; content: string }[],
  ): Promise<string | null> => {
    if (!settings.provider) {
      setError("No AI provider configured. Go to Settings.");
      setState("error");
      return null;
    }

    setState("loading");
    setError(null);

    try {
      const content = await callAI(settings.provider, messages);
      setState("idle");
      return content;
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : "Unknown error occurred";
      setError(message);
      setState("error");
      return null;
    }
  };

  const reset = () => {
    setState("idle");
    setError(null);
  };

  return { run, state, error, reset };
}
