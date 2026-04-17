import type { ProviderId } from "../lib/ai/providers";

export interface AIProvider {
  id: ProviderId;
  name: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  accountId?: string; // Cloudflare only
}

export interface AISettings {
  provider: AIProvider | null;
}

export type AIActionState = "idle" | "loading" | "error";

export interface AISuggestionResult {
  original: string;
  suggestion: string;
  action: "replace" | "review";
}
