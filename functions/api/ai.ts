interface AIRequest {
  provider: "openrouter" | "cloudflare";
  baseUrl: string;
  apiKey: string;
  model: string;
  messages: { role: string; content: string }[];
  temperature?: number;
  max_tokens?: number;
}

export const onRequestPost: PagesFunction = async (context) => {
  const body: AIRequest = await context.request.json();

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
    return new Response(
      JSON.stringify({ error: { message: "Missing required fields" } }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  // Validate baseUrl is a proper HTTPS URL to prevent SSRF
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(`${baseUrl}/chat/completions`);
  } catch {
    return new Response(
      JSON.stringify({ error: { message: "Invalid base URL" } }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }

  if (parsedUrl.protocol !== "https:") {
    return new Response(
      JSON.stringify({ error: { message: "Only HTTPS URLs are allowed" } }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
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

    return new Response(JSON.stringify(data), {
      status: response.status,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: { message: "Failed to reach AI provider" } }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
};

// Handle CORS preflight
export const onRequestOptions: PagesFunction = async () => {
  return new Response(null, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
};
