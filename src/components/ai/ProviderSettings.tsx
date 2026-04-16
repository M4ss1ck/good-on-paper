import { useState } from "react";
import { Check, X } from "lucide-react";
import type { AIProvider } from "../../types/ai";
import { useAIStore } from "../../store/aiStore";
import { callAI } from "../../lib/ai/provider";

const OPENROUTER_BASE = "https://openrouter.ai/api/v1";
const CLOUDFLARE_BASE_TEMPLATE =
  "https://api.cloudflare.com/client/v4/accounts/{accountId}/ai/v1";

const DEFAULTS: Record<
  AIProvider["id"],
  { name: string; model: string; baseUrl: string }
> = {
  openrouter: {
    name: "OpenRouter",
    model: "meta-llama/llama-3.3-70b-instruct:free",
    baseUrl: OPENROUTER_BASE,
  },
  cloudflare: {
    name: "Cloudflare Workers AI",
    model: "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
    baseUrl: CLOUDFLARE_BASE_TEMPLATE,
  },
};

type TestStatus = "idle" | "testing" | "success" | "error";

export function ProviderSettings() {
  const settingsOpen = useAIStore((s) => s.settingsOpen);
  const setSettingsOpen = useAIStore((s) => s.setSettingsOpen);

  if (!settingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) setSettingsOpen(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Escape") setSettingsOpen(false);
      }}
    >
      <SettingsForm onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function SettingsForm({ onClose }: { onClose: () => void }) {
  const provider = useAIStore((s) => s.settings.provider);
  const setProvider = useAIStore((s) => s.setProvider);

  const [providerId, setProviderId] = useState<AIProvider["id"]>(
    provider?.id ?? "openrouter",
  );
  const [apiKey, setApiKey] = useState(provider?.apiKey ?? "");
  const [model, setModel] = useState(
    provider?.model ?? DEFAULTS[provider?.id ?? "openrouter"].model,
  );
  const [accountId, setAccountId] = useState(provider?.accountId ?? "");
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testError, setTestError] = useState<string | null>(null);

  const handleProviderChange = (id: AIProvider["id"]) => {
    setProviderId(id);
    setModel(DEFAULTS[id].model);
    setTestStatus("idle");
    setTestError(null);
  };

  const buildBaseUrl = () => {
    if (providerId === "cloudflare") {
      return CLOUDFLARE_BASE_TEMPLATE.replace("{accountId}", accountId);
    }
    return DEFAULTS[providerId].baseUrl;
  };

  const handleSave = () => {
    const p: AIProvider = {
      id: providerId,
      name: DEFAULTS[providerId].name,
      baseUrl: buildBaseUrl(),
      apiKey,
      model,
      ...(providerId === "cloudflare" ? { accountId } : {}),
    };
    setProvider(p);
    onClose();
  };

  const handleTest = async () => {
    setTestStatus("testing");
    setTestError(null);

    const testProvider: AIProvider = {
      id: providerId,
      name: DEFAULTS[providerId].name,
      baseUrl: buildBaseUrl(),
      apiKey,
      model,
    };

    try {
      await callAI(testProvider, [
        { role: "user", content: "Say 'ok' and nothing else." },
      ]);
      setTestStatus("success");
    } catch (e: unknown) {
      setTestStatus("error");
      setTestError(e instanceof Error ? e.message : "Connection failed");
    }
  };

  const canSave = apiKey.trim() && model.trim();
  const canTest = canSave && (providerId !== "cloudflare" || accountId.trim());

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent";

  return (
    <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 className="text-lg font-semibold text-primary">AI Settings</h2>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          <X size={18} />
        </button>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Provider selector */}
        <fieldset>
          <legend className={labelClass}>Provider</legend>
          <div className="flex gap-4 mt-1">
            {(["openrouter", "cloudflare"] as const).map((id) => (
              <label key={id} className="flex items-center gap-2 text-sm">
                <input
                  type="radio"
                  name="provider"
                  value={id}
                  checked={providerId === id}
                  onChange={() => handleProviderChange(id)}
                  className="accent-accent"
                />
                {DEFAULTS[id].name}
              </label>
            ))}
          </div>
        </fieldset>

        {/* API Key */}
        <div>
          <label className={labelClass}>API Key</label>
          <div className="relative">
            <input
              type={showKey ? "text" : "password"}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="sk-..."
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted hover:text-primary"
            >
              {showKey ? "Hide" : "Show"}
            </button>
          </div>
        </div>

        {/* Account ID (Cloudflare only) */}
        {providerId === "cloudflare" && (
          <div>
            <label className={labelClass}>Account ID</label>
            <input
              type="text"
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder="your-cloudflare-account-id"
              className={inputClass}
            />
          </div>
        )}

        {/* Model */}
        <div>
          <label className={labelClass}>Model</label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Test connection */}
        <div>
          <button
            onClick={handleTest}
            disabled={!canTest || testStatus === "testing"}
            className="px-3 py-1.5 text-sm rounded border border-gray-200 text-muted hover:text-primary hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testStatus === "testing" ? "Testing..." : "Test connection"}
          </button>
          {testStatus === "success" && (
            <span className="ml-2 text-sm text-green-600 inline-flex items-center gap-1">
              <Check size={14} /> Connection successful
            </span>
          )}
          {testStatus === "error" && (
            <span className="ml-2 text-sm text-red-500 inline-flex items-center gap-1">
              <X size={14} /> {testError}
            </span>
          )}
        </div>

        {/* Privacy notice */}
        <p className="text-xs text-gray-400 leading-relaxed">
          Your API key is stored locally in your browser and sent only to the
          AI provider you configure. It never passes through our servers — the
          proxy only forwards your request.
        </p>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded border border-gray-200 text-muted hover:text-primary transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="px-4 py-2 text-sm rounded bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
      </div>
    </div>
  );
}
