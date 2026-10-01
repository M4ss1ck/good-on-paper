import type { ExportedHandler, Fetcher } from "@cloudflare/workers-types";

const USER_AGENT = "good-on-paper";

interface Env {
  ASSETS: Fetcher;
}

interface AIRequest {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
  reasoning_effort?: string;
  sessionId?: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", ...corsHeaders },
  });
}

async function handleAI(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (request.method !== "POST") {
    return jsonResponse({ error: { message: "Method not allowed" } }, 405);
  }

  const body: AIRequest = await request.json();

  const {
    provider,
    baseUrl,
    apiKey,
    model,
    messages,
    temperature = 0.7,
    max_tokens = 1024,
    reasoning_effort,
    sessionId,
  } = body;

  // Validate required fields
  if (!baseUrl || !apiKey || !model || !messages?.length) {
    return jsonResponse({ error: { message: "Missing required fields" } }, 400);
  }

  // Validate baseUrl is a proper HTTPS URL to prevent SSRF
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(`${baseUrl}/chat/completions`);
  } catch {
    return jsonResponse({ error: { message: "Invalid base URL" } }, 400);
  }

  if (parsedUrl.protocol !== "https:") {
    return jsonResponse(
      { error: { message: "Only HTTPS URLs are allowed" } },
      400,
    );
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${apiKey}`,
  };

  // OpenCode Zen/Go require a stable per-session ID and an identifying
  // User-Agent on every request.
  if (provider === "opencode_go") {
    headers["User-Agent"] = USER_AGENT;
    headers["x-opencode-session"] =
      typeof sessionId === "string" && sessionId ? sessionId : crypto.randomUUID();
  }

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
        ...(reasoning_effort != null && { reasoning_effort }),
      }),
    });

    const data = await response.json();
    return jsonResponse(data, response.status);
  } catch {
    return jsonResponse(
      { error: { message: "Failed to reach AI provider" } },
      502,
    );
  }
}

export default {
  async fetch(request, env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/ai") {
      return handleAI(request);
    }

    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
