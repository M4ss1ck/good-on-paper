import { useState } from "react";
import { X, Globe } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useCVStore } from "../../store/cvStore";
import { useAIStore } from "../../store/aiStore";
import { useAIAction } from "../../hooks/useAIAction";
import { translateCVPrompt, deserializeTranslation } from "../../lib/ai/prompts";
import { localeToLanguageName } from "../../lib/localeToLanguageName";
import { useFocusTrap } from "../../hooks/useFocusTrap";

const LOCALE_OPTIONS = ["en", "es", "pt", "fr", "de", "it"];

interface TranslateCVProps {
  open: boolean;
  onClose: () => void;
}

export function TranslateCV({ open, onClose }: TranslateCVProps) {
  const cv = useCVStore((s) => s.activeCv());
  const forkCV = useCVStore((s) => s.forkCV);
  const applyTranslatedCV = useCVStore((s) => s.applyTranslatedCV);
  const updateMeta = useCVStore((s) => s.updateMeta);
  const hasProvider = useAIStore((s) => s.settings.provider !== null);
  const { run, state, reset } = useAIAction();

  const sourceLocale = cv?.meta.locale ?? "en";
  const [targetLocale, setTargetLocale] = useState(() =>
    sourceLocale === "en" ? "es" : "en",
  );
  const [resultMessage, setResultMessage] = useState<string | null>(null);
  const [rawResponse, setRawResponse] = useState<string | null>(null);
  const trapRef = useFocusTrap<HTMLDivElement>(onClose);

  if (!open || !cv) return null;

  const isLoading = state === "loading";

  const handleTranslate = async () => {
    setResultMessage(null);
    setRawResponse(null);
    reset();

    const messages = translateCVPrompt(cv, targetLocale);
    const result = await run(messages, { max_tokens: 16384, reasoning_effort: "none" });
    if (!result) return;

    // Try to parse the response
    let jsonStr = result.trim();
    // Strip markdown fences if present
    if (jsonStr.startsWith("```")) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    }

    try {
      const { cv: translatedCV, warnings } = deserializeTranslation(cv, jsonStr);

      // Fork and apply
      const sourceName = cv.name;
      const targetLang = localeToLanguageName(targetLocale);
      const newName = `${sourceName} (${targetLang})`;
      forkCV(cv.id, newName);
      applyTranslatedCV(translatedCV);
      updateMeta({ locale: targetLocale });

      if (warnings.length > 0) {
        setResultMessage(
          t`Translation complete with warnings: ${warnings.join("; ")}. Review: AI translations may need adjustments.`,
        );
      } else {
        setResultMessage(
          t`Translation complete. Review: AI translations may need adjustments.`,
        );
        setTimeout(onClose, 2000);
      }
    } catch (e) {
      if (e instanceof Error && e.message === "JSON_PARSE_FAILED") {
        setRawResponse(result);
        setResultMessage(
          t`Couldn't parse the AI response as JSON. Copy and apply manually.`,
        );
      } else {
        setResultMessage(
          e instanceof Error ? e.message : t`Unknown error`,
        );
      }
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={onClose}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="translate-cv-title"
        className="bg-white rounded-lg shadow-lg w-full max-w-md mx-2 sm:mx-4 max-h-[85dvh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <h2 id="translate-cv-title" className="text-sm font-medium text-primary flex items-center gap-1.5">
            <Globe size={14} />
            <Trans>Translate CV</Trans>
          </h2>
          <button
            onClick={onClose}
            aria-label={t`Close`}
            className="text-light hover:text-muted transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Source locale */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1">
              <Trans>Current language</Trans>
            </label>
            <div className="text-sm text-primary">
              {localeToLanguageName(sourceLocale)} ({sourceLocale})
            </div>
          </div>

          {/* Target locale */}
          <div>
            <label className="text-xs font-medium text-muted block mb-1">
              <Trans>Translate to</Trans>
            </label>
            <input
              list="translate-locale-options"
              className="w-full border border-gray-200 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-accent transition-colors"
              placeholder={t`e.g. en, es, pt-BR`}
              value={targetLocale}
              onChange={(e) => setTargetLocale(e.target.value)}
            />
            <datalist id="translate-locale-options">
              {LOCALE_OPTIONS.filter((c) => c !== sourceLocale).map((code) => (
                <option key={code} value={code}>
                  {localeToLanguageName(code)}
                </option>
              ))}
            </datalist>
          </div>

          {/* Translate button */}
          <button
            onClick={handleTranslate}
            disabled={isLoading || !hasProvider || !targetLocale.trim() || targetLocale === sourceLocale}
            className="w-full px-4 py-2 text-sm font-medium rounded bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <Trans>Translating...</Trans>
            ) : (
              <Trans>Translate</Trans>
            )}
          </button>

          {!hasProvider && (
            <p className="text-xs text-red-500">
              <Trans>No AI provider configured. Go to AI Settings first.</Trans>
            </p>
          )}

          {/* Result message */}
          {resultMessage && (
            <div
              className={`text-xs p-2 rounded ${rawResponse ? "bg-red-50 text-red-700" : "bg-green-50 text-green-700"}`}
            >
              {resultMessage}
            </div>
          )}

          {/* Raw response fallback */}
          {rawResponse && (
            <div className="space-y-1">
              <label className="text-xs font-medium text-muted block">
                <Trans>Raw AI response</Trans>
              </label>
              <textarea
                readOnly
                className="w-full h-40 text-xs font-mono border border-gray-200 rounded p-2 bg-gray-50"
                value={rawResponse}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
