import { describe, it, expect, vi, afterEach } from "vitest";
import worker from "./index";

// The handler is typed with workers-types; the test drives it with Node's Request.
const handle = worker.fetch as unknown as (request: Request) => Promise<Response>;

function aiRequest(body: Record<string, unknown>): Request {
  return new Request("https://example.com/api/ai", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      baseUrl: "https://upstream.example/v1",
      apiKey: "key",
      model: "m",
      messages: [{ role: "user", content: "hi" }],
      ...body,
    }),
  });
}

/** Sends a request through the worker and returns the headers it sent upstream. */
async function upstreamHeaders(body: Record<string, unknown>) {
  const upstream = vi.fn(async () => Response.json({ choices: [] }));
  vi.stubGlobal("fetch", upstream);
  await handle(aiRequest(body));
  const [, init] = upstream.mock.calls[0] as unknown as [string, RequestInit];
  return init.headers as Record<string, string>;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("worker /api/ai upstream headers", () => {
  it("sends the client session ID and User-Agent to OpenCode Go", async () => {
    const headers = await upstreamHeaders({ provider: "opencode_go", sessionId: "abc-123" });
    expect(headers["x-opencode-session"]).toBe("abc-123");
    expect(headers["User-Agent"]).toBe("good-on-paper");
    expect(headers.Authorization).toBe("Bearer key");
  });

  it("still sends a session ID to OpenCode Go when the client sent none", async () => {
    const headers = await upstreamHeaders({ provider: "opencode_go" });
    expect(headers["x-opencode-session"]).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("sends no OpenCode headers to other providers", async () => {
    const headers = await upstreamHeaders({ provider: "openai", sessionId: "abc-123" });
    expect(headers["x-opencode-session"]).toBeUndefined();
    expect(headers["User-Agent"]).toBeUndefined();
  });
});
