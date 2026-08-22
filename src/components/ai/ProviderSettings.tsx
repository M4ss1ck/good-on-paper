import { useState } from "react";
import { Check, X } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import type { AIProvider } from "../../types/ai";
import { useAIStore } from "../../store/aiStore";
import { callAI } from "../../lib/ai/provider";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { PROVIDERS, PROVIDER_IDS } from "../../lib/ai/providers";

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
    provider?.model ?? PROVIDERS[provider?.id ?? "openrouter"].defaultModel,
  );
  const [accountId, setAccountId] = useState(provider?.accountId ?? "");
  const [maxTokens, setMaxTokens] = useState(
    provider?.maxTokens != null ? String(provider.maxTokens) : "",
  );
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>("idle");
  const [testError, setTestError] = useState<string | null>(null);

  const handleProviderChange = (id: AIProvider["id"]) => {
    setProviderId(id);
    setModel(PROVIDERS[id].defaultModel);
    setTestStatus("idle");
    setTestError(null);
  };

  const buildBaseUrl = () => {
    const config = PROVIDERS[providerId];
    if (config.requiresAccountId) {
      return config.baseUrl.replace("{accountId}", accountId);
    }
    return config.baseUrl;
  };

  const handleSave = () => {
    const config = PROVIDERS[providerId];
    const parsedMaxTokens = maxTokensValue;
    const p: AIProvider = {
      id: providerId,
      name: config.name,
      baseUrl: buildBaseUrl(),
      apiKey,
      model,
      ...(config.requiresAccountId ? { accountId } : {}),
      ...(parsedMaxTokens != null ? { maxTokens: parsedMaxTokens } : {}),
    };
    setProvider(p);
    onClose();
  };

  const handleTest = async () => {
    setTestStatus("testing");
    setTestError(null);

    const testProvider: AIProvider = {
      id: providerId,
      name: PROVIDERS[providerId].name,
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

  // Blank means "use the per-action default".
  const maxTokensValue =
    maxTokens.trim() === "" ? null : Number.parseInt(maxTokens, 10);
  const maxTokensInvalid =
    maxTokensValue != null &&
    (!Number.isFinite(maxTokensValue) ||
      maxTokensValue < 256 ||
      maxTokensValue > 200000);

  const canSave = apiKey.trim() && model.trim() && !maxTokensInvalid;
  const canTest =
    canSave && (!PROVIDERS[providerId].requiresAccountId || accountId.trim());

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass =
    "w-full px-3 py-2 text-sm border border-gray-200 rounded focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent";

  const trapRef = useFocusTrap<HTMLDivElement>(onClose);

  return (
    <div ref={trapRef} role="dialog" aria-modal="true" aria-labelledby="ai-settings-title" className="bg-white rounded-lg shadow-xl w-full max-w-md mx-2 sm:mx-4 max-h-[90dvh] overflow-y-auto">
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
        <h2 id="ai-settings-title" className="text-lg font-semibold text-primary"><Trans>AI Settings</Trans></h2>
        <button
          onClick={onClose}
          aria-label={t`Close`}
          className="text-gray-400 hover:text-gray-600 text-xl leading-none"
        >
          <X size={18} />
        </button>
      </div>

      <div className="px-6 py-4 space-y-4">
        {/* Provider selector */}
        <div>
          <label htmlFor="ai-provider-select" className={labelClass}>
            <Trans>Provider</Trans>
          </label>
          <select
            id="ai-provider-select"
            value={providerId}
            onChange={(e) =>
              handleProviderChange(e.target.value as AIProvider["id"])
            }
            className={inputClass}
          >
            {PROVIDER_IDS.map((id) => (
              <option key={id} value={id}>
                {PROVIDERS[id].name}
              </option>
            ))}
          </select>
        </div>

        {/* API Key */}
        <div>
          <label className={labelClass}><Trans>API Key</Trans></label>
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
              {showKey ? t`Hide` : t`Show`}
            </button>
          </div>
        </div>

        {/* Account ID (only for providers that need it, e.g. Cloudflare) */}
        {PROVIDERS[providerId].requiresAccountId && (
          <div>
            <label className={labelClass}><Trans>Account ID</Trans></label>
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
          <label className={labelClass}><Trans>Model</Trans></label>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            className={inputClass}
          />
        </div>

        {/* Max output tokens */}
        <div>
          <label className={labelClass}><Trans>Max output tokens</Trans></label>
          <input
            type="number"
            min={256}
            max={200000}
            value={maxTokens}
            onChange={(e) => setMaxTokens(e.target.value)}
            placeholder="8192"
            className={inputClass}
          />
          <p className="text-xs text-muted mt-1">
            <Trans>
              Optional. Leave blank to use the default of 8192. Raise it only if
              your model supports longer output; providers reject values above
              their model's limit.
            </Trans>
          </p>
          {maxTokensInvalid && (
            <p className="text-xs text-red-600 mt-1">
              <Trans>Enter a number between 256 and 200000, or leave it blank.</Trans>
            </p>
          )}
        </div>

        {/* Test connection */}
        <div>
          <button
            onClick={handleTest}
            disabled={!canTest || testStatus === "testing"}
            className="px-3 py-1.5 text-sm rounded border border-gray-200 text-muted hover:text-primary hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {testStatus === "testing" ? t`Testing...` : t`Test connection`}
          </button>
          {testStatus === "success" && (
            <span className="ml-2 text-sm text-green-600 inline-flex items-center gap-1">
              <Check size={14} /> <Trans>Connection successful</Trans>
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
          <Trans>
            Your API key is stored locally in your browser and sent only to the
            AI provider you configure. It never passes through our servers. The
            proxy only forwards your request.
          </Trans>
        </p>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-200">
        <button
          onClick={onClose}
          className="px-4 py-2 text-sm rounded border border-gray-200 text-muted hover:text-primary transition-colors"
        >
          <Trans>Cancel</Trans>
        </button>
        <button
          onClick={handleSave}
          disabled={!canSave}
          className="px-4 py-2 text-sm rounded bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Trans>Save</Trans>
        </button>
      </div>
    </div>
  );
}
