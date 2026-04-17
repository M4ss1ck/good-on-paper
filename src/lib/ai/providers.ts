export interface ProviderConfig {
  name: string;
  baseUrl: string;
  defaultModel: string;
  requiresAccountId: boolean;
}

export const PROVIDERS = {
  openrouter: {
    name: "OpenRouter",
    baseUrl: "https://openrouter.ai/api/v1",
    defaultModel: "meta-llama/llama-3.3-70b-instruct:free",
    requiresAccountId: false,
  },
  openai: {
    name: "OpenAI",
    baseUrl: "https://api.openai.com/v1",
    defaultModel: "gpt-4o-mini",
    requiresAccountId: false,
  },
  gemini: {
    name: "Google Gemini",
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai",
    defaultModel: "gemini-2.0-flash",
    requiresAccountId: false,
  },
  mistral: {
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    defaultModel: "mistral-small-latest",
    requiresAccountId: false,
  },
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    defaultModel: "llama-3.3-70b-versatile",
    requiresAccountId: false,
  },
  deepseek: {
    name: "DeepSeek",
    baseUrl: "https://api.deepseek.com/v1",
    defaultModel: "deepseek-chat",
    requiresAccountId: false,
  },
  xai: {
    name: "xAI (Grok)",
    baseUrl: "https://api.x.ai/v1",
    defaultModel: "grok-2-latest",
    requiresAccountId: false,
  },
  cloudflare: {
    name: "Cloudflare Workers AI",
    baseUrl:
      "https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1",
    defaultModel: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    requiresAccountId: true,
  },
} as const satisfies Record<string, ProviderConfig>;

export type ProviderId = keyof typeof PROVIDERS;

export const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

export function isProviderId(value: unknown): value is ProviderId {
  return typeof value === "string" && value in PROVIDERS;
}
