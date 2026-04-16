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

function friendlyError(status: number, message: string): string {
  if (status === 429) return "Rate limited. Try again in a minute.";
  if (status === 401 || status === 403)
    return "Invalid API key. Check your settings.";
  if (status === 502 || status === 503)
    return "Couldn't reach the AI provider";
  return message || `Provider returned ${status}`;
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

  let res: Response;
  try {
    res = await fetch("/api/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error("Couldn't reach the AI provider");
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    const raw =
      (err as { error?: { message?: string } }).error?.message || "";
    throw new Error(friendlyError(res.status, raw));
  }

  const data = await res.json();
  const content = (
    data as { choices?: { message?: { content?: string } }[] }
  ).choices?.[0]?.message?.content?.trim();

  if (!content)
    throw new Error("The AI returned an empty response. Try again.");

  return content;
}
