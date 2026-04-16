import type { ExportedHandler } from "@cloudflare/workers-types";

interface AIRequest {
  provider: "openrouter" | "cloudflare";
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
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
    baseUrl,
    apiKey,
    model,
    messages,
    temperature = 0.7,
    max_tokens = 1024,
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

  try {
    const response = await fetch(parsedUrl.toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
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
  async fetch(request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === "/api/ai") {
      return handleAI(request);
    }

    // All other requests are handled by the assets binding (static files)
    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler;
