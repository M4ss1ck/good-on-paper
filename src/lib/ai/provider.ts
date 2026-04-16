import type { AIProvider } from "../../types/ai";

interface AIRequestBody {
  provider: AIProvider["id"];
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}

export async function callAI(
  provider: AIProvider,
  messages: { role: string; content: string }[],
): Promise<string> {
  const body: AIRequestBody = {
    provider: provider.id,
    baseUrl: provider.baseUrl,
    apiKey: provider.apiKey,
    model: provider.model,
    messages,
  };

  const res = await fetch("/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(
      (err as { error?: { message?: string } }).error?.message ||
      `Provider returned ${res.status}`,
    );
  }

  const data = await res.json();
  const content = (
    data as { choices?: { message?: { content?: string } }[] }
  ).choices?.[0]?.message?.content?.trim();

  if (!content) throw new Error("Empty response from provider");

  return content;
}
