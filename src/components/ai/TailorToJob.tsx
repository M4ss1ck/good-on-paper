import { useMemo, useState } from "react";
import { Target, Check, X, ArrowLeft, Copy, Sparkles } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useCVStore } from "../../store/cvStore";
import { useAIStore } from "../../store/aiStore";
import { useUIStore } from "../../store/uiStore";
import { useAIAction } from "../../hooks/useAIAction";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { getLocale } from "../../i18n";
import { tailorToJobPrompt } from "../../lib/ai/prompts";
import { buildHandoffPrompt } from "../../lib/ai/handoffPrompt";
import { adaptedCVName } from "../../lib/ai/importAdaptation";
import {
  ADAPTATION_TEMPERATURE,
  DEFAULT_MAX_TOKENS,
} from "../../lib/ai/provider";
import {
  parseTailorResponse,
  resolveSuggestion,
  currentTextOf,
  suggestedTextOf,
  sectionLabelOf,
  bulletIndexOf,
  type ParsedTailorResponse,
  type ResolutionFailure,
} from "../../lib/ai/suggestions";
import type { Suggestion } from "../../lib/schemas/adaptation";

/** Below this, a "job offer" is almost certainly just a job title. */
const SHORT_OFFER_THRESHOLD = 200;

type SuggestionStatus = "accepted" | "dismissed";

interface TailorToJobProps {
  onClose: () => void;
}

function opLabel(op: Suggestion["op"]): string {
  switch (op) {
    case "replace_summary":
      return t`Rewrite summary`;
    case "replace_bullet":
      return t`Reword bullet`;
    case "add_bullet":
      return t`Add bullet`;
    case "remove_bullet":
      return t`Remove bullet`;
    case "replace_skill_group":
      return t`Reorder skills`;
    case "replace_meta_title":
      return t`Change headline`;
    case "replace_custom":
      return t`Rewrite section`;
  }
}

function failureLabel(reason: ResolutionFailure): string {
  switch (reason) {
    case "section-missing":
      return t`This section is no longer in your CV.`;
    case "item-missing":
      return t`This entry is no longer in your CV.`;
    case "bullet-missing":
      return t`This bullet is no longer in your CV.`;
    case "type-mismatch":
      return t`The AI pointed this at the wrong kind of section.`;
  }
}

export function TailorToJob({ onClose }: TailorToJobProps) {
  const cv = useCVStore((s) => s.activeCv());
  const forkCV = useCVStore((s) => s.forkCV);
  const updateItem = useCVStore((s) => s.updateItem);
  const updateBullet = useCVStore((s) => s.updateBullet);
  const addBullet = useCVStore((s) => s.addBullet);
  const removeBullet = useCVStore((s) => s.removeBullet);
  const updateMeta = useCVStore((s) => s.updateMeta);
  const provider = useAIStore((s) => s.settings.provider);
  const pushToast = useUIStore((s) => s.pushToast);
  const drafts = useUIStore((s) => s.adaptationDrafts);
  const setAdaptationDraft = useUIStore((s) => s.setAdaptationDraft);
  const { run, state, error, reset } = useAIAction();
  const trapRef = useFocusTrap<HTMLDivElement>(onClose);

  // Pinned when the dialog opens: accepting a suggestion forks the CV and
  // changes the active id, which must not move the draft out from under us.
  const [sourceCvId] = useState(() => cv?.id ?? "");
  const sourceCv = useCVStore((s) => s.workspace.cvs[sourceCvId]);

  const draft = drafts[sourceCvId] ?? { jobOffer: "", additionalContext: "" };
  const [view, setView] = useState<"form" | "handoff">("form");
  const [result, setResult] = useState<ParsedTailorResponse | null>(null);
  const [statuses, setStatuses] = useState<Record<number, SuggestionStatus>>({});
  const [forked, setForked] = useState(false);

  const handoffPrompt = useMemo(() => {
    if (view !== "handoff" || !sourceCv) return "";
    return buildHandoffPrompt({
      cv: sourceCv,
      jobOffer: draft.jobOffer,
      additionalContext: draft.additionalContext,
      locale: getLocale(),
    });
  }, [view, sourceCv, draft.jobOffer, draft.additionalContext]);

  if (!cv) return null;

  const isLoading = state === "loading";
  const hasOffer = draft.jobOffer.trim().length > 0;
  const offerLooksShort =
    hasOffer && draft.jobOffer.trim().length < SHORT_OFFER_THRESHOLD;

  const applySuggestion = (s: Suggestion) => {
    switch (s.op) {
      case "replace_meta_title":
        updateMeta({ title: s.suggested });
        break;
      case "replace_summary":
      case "replace_custom":
        updateItem(s.sectionId, s.itemId, { content: s.suggested });
        break;
      case "replace_skill_group":
        updateItem(s.sectionId, s.itemId, { items: s.suggested });
        break;
      case "add_bullet":
        addBullet(s.sectionId, s.itemId, s.suggested);
        break;
      case "replace_bullet": {
        const index = bulletIndexOf(cv, s);
        if (index !== null) updateBullet(s.sectionId, s.itemId, index, s.suggested);
        break;
      }
      case "remove_bullet": {
        const index = bulletIndexOf(cv, s);
        if (index !== null) removeBullet(s.sectionId, s.itemId, index);
        break;
      }
    }
  };

  const handleAdapt = async () => {
    setResult(null);
    setStatuses({});
    reset();

    const messages = tailorToJobPrompt(
      cv,
      draft.jobOffer,
      draft.additionalContext,
    );
    const raw = await run(messages, {
      temperature: ADAPTATION_TEMPERATURE,
      max_tokens: provider?.maxTokens ?? DEFAULT_MAX_TOKENS,
      reasoning_effort: "none",
    });
    if (!raw) return;
    setResult(parseTailorResponse(raw));
  };

  const handleAccept = (index: number, suggestion: Suggestion) => {
    // The first accepted suggestion forks: the master CV is never edited.
    if (!forked) {
      const target = result?.kind === "ok" ? (result.target ?? {}) : {};
      const name = adaptedCVName(target, cv.name, t`Adapted`);
      forkCV(cv.id, name);
      setForked(true);
      pushToast({ tone: "success", message: t`Created "${name}"` });
    }
    applySuggestion(suggestion);
    setStatuses((prev) => ({ ...prev, [index]: "accepted" }));
  };

  const handleDismiss = (index: number) => {
    setStatuses((prev) => ({ ...prev, [index]: "dismissed" }));
  };

  const handleCopyPrompt = async () => {
    try {
      await navigator.clipboard.writeText(handoffPrompt);
      pushToast({ tone: "success", message: t`Prompt copied to clipboard` });
    } catch {
      pushToast({
        tone: "error",
        message: t`Couldn't copy. Select the prompt and copy it manually.`,
      });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={trapRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tailor-title"
        className="bg-white rounded-lg shadow-xl w-full max-w-2xl mx-2 sm:mx-4 max-h-[85dvh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 id="tailor-title" className="text-lg font-semibold text-primary flex items-center gap-1.5">
            {view === "handoff" ? (
              <>
                <button
                  onClick={() => setView("form")}
                  aria-label={t`Back`}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <ArrowLeft size={18} />
                </button>
                <Trans>Use an external AI</Trans>
              </>
            ) : (
              <>
                <Target size={18} />
                <Trans>Adapt my CV</Trans>
              </>
            )}
          </h2>
          <button
            onClick={onClose}
            aria-label={t`Close`}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          {view === "handoff" ? (
            <HandoffView prompt={handoffPrompt} onCopy={handleCopyPrompt} />
          ) : (
            <>
              {/* Job offer */}
              <div>
                <label
                  htmlFor="tailor-job-offer"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  <Trans>Paste the full job offer</Trans>
                </label>
                <textarea
                  id="tailor-job-offer"
                  value={draft.jobOffer}
                  onChange={(e) =>
                    setAdaptationDraft(sourceCvId, { jobOffer: e.target.value })
                  }
                  disabled={isLoading}
                  placeholder={t`Paste the complete job description here, not just the job title.`}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-y min-h-32 disabled:opacity-60 disabled:bg-gray-50"
                  rows={6}
                />
                {offerLooksShort && (
                  <p className="text-xs text-amber-600 mt-1">
                    <Trans>
                      This looks short. Paste the full job offer, not just the
                      title, so the AI can match its wording and requirements.
                    </Trans>
                  </p>
                )}
              </div>

              {/* Additional context */}
              <div>
                <label
                  htmlFor="tailor-context"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  <Trans>Additional context & instructions</Trans>
                </label>
                <p className="text-xs text-muted mb-1">
                  <Trans>
                    Add experience missing from your CV, clarify your background,
                    or tell the AI how you want this application adapted.
                  </Trans>
                </p>
                <textarea
                  id="tailor-context"
                  value={draft.additionalContext}
                  onChange={(e) =>
                    setAdaptationDraft(sourceCvId, {
                      additionalContext: e.target.value,
                    })
                  }
                  disabled={isLoading}
                  placeholder={t`Example: I have used Kubernetes professionally for about a year, but it isn't currently mentioned in my CV. Emphasize backend work and don't change my current job title.`}
                  className="w-full border border-gray-200 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-y min-h-20 disabled:opacity-60 disabled:bg-gray-50"
                  rows={3}
                />
              </div>

              {/* Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleAdapt}
                  disabled={!hasOffer || isLoading || !provider}
                  className="px-4 py-2 text-sm rounded bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {isLoading ? (
                    <>
                      <span className="inline-block w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      <Trans>Adapting...</Trans>
                    </>
                  ) : (
                    <Trans>Adapt with configured AI</Trans>
                  )}
                </button>
                <button
                  onClick={() => setView("handoff")}
                  disabled={!hasOffer}
                  className="px-4 py-2 text-sm rounded border border-accent/40 text-accent hover:bg-accent/5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  <Sparkles size={14} />
                  <Trans>Use an external AI</Trans>
                </button>
              </div>

              {!provider && (
                <p className="text-xs text-muted">
                  <Trans>
                    No AI provider configured. Add one in AI Settings, or use an
                    external AI instead.
                  </Trans>
                </p>
              )}

              {state === "error" && error && (
                <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                  {error}
                </div>
              )}

              {result && (
                <ResultView
                  result={result}
                  statuses={statuses}
                  onAccept={handleAccept}
                  onDismiss={handleDismiss}
                />
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end px-6 py-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-gray-200 text-muted hover:text-primary transition-colors"
          >
            <Trans>Close</Trans>
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Handoff ────────────────────────────────────────────────

function HandoffView({
  prompt,
  onCopy,
}: {
  prompt: string;
  onCopy: () => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-sm text-muted">
        <Trans>
          Copy this prompt and paste it into ChatGPT, Claude, Codex, OpenCode, Pi
          or any other capable chat model. It already contains your CV, the job
          offer and the rules the AI must follow.
        </Trans>
      </p>

      <div className="relative">
        <button
          onClick={onCopy}
          className="absolute top-2 right-2 px-2.5 py-1.5 text-xs rounded bg-accent text-white hover:bg-accent/90 transition-colors inline-flex items-center gap-1.5 shadow-sm"
        >
          <Copy size={13} />
          <Trans>Copy prompt</Trans>
        </button>
        <textarea
          readOnly
          value={prompt}
          aria-label={t`Generated prompt`}
          className="w-full border border-gray-200 rounded px-3 py-2 pr-28 text-xs font-mono bg-gray-50 text-primary resize-y min-h-64 focus:outline-none focus:ring-2 focus:ring-accent/50"
          rows={16}
        />
      </div>

      <div className="p-3 text-sm text-primary bg-accent/5 border border-accent/20 rounded space-y-1">
        <p className="font-medium">
          <Trans>When the AI replies</Trans>
        </p>
        <p className="text-muted text-xs">
          <Trans>
            Save its answer as a .json file, then use Import JSON in the toolbar.
            Good on Paper validates it and creates a new CV. Your current CV is
            never modified.
          </Trans>
        </p>
      </div>
    </div>
  );
}

// ── Results ────────────────────────────────────────────────

function ResultView({
  result,
  statuses,
  onAccept,
  onDismiss,
}: {
  result: ParsedTailorResponse;
  statuses: Record<number, SuggestionStatus>;
  onAccept: (index: number, suggestion: Suggestion) => void;
  onDismiss: (index: number) => void;
}) {
  if (result.kind === "not-json") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-amber-600 font-medium">
          <Trans>
            The AI didn't return JSON. Showing its raw answer so you can use it
            manually:
          </Trans>
        </p>
        <div className="p-3 text-sm text-primary bg-gray-50 border border-gray-200 rounded whitespace-pre-wrap">
          {result.raw}
        </div>
      </div>
    );
  }

  if (result.kind === "bad-shape") {
    return (
      <div className="space-y-2">
        <p className="text-xs text-red-600 font-medium">
          <Trans>
            The AI returned JSON in the wrong shape. Nothing was applied.
          </Trans>
        </p>
        <ul className="text-xs text-red-600 bg-red-50 border border-red-200 rounded p-3 space-y-0.5 font-mono">
          {result.issues.slice(0, 10).map((issue, i) => (
            <li key={i}>{issue}</li>
          ))}
        </ul>
        <details className="text-xs text-muted">
          <summary className="cursor-pointer">
            <Trans>Show raw response</Trans>
          </summary>
          <div className="mt-2 p-3 text-sm text-primary bg-gray-50 border border-gray-200 rounded whitespace-pre-wrap">
            {result.raw}
          </div>
        </details>
      </div>
    );
  }

  const pending = result.suggestions.filter((_, i) => !statuses[i]).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        <Trans>{pending} suggestions remaining</Trans>
      </p>

      {result.skipped > 0 && (
        <p className="text-xs text-amber-600">
          <Trans>
            {result.skipped} suggestions were malformed and skipped.
          </Trans>
        </p>
      )}

      {result.suggestions.length === 0 && (
        <p className="text-sm text-muted py-4 text-center">
          <Trans>
            No suggestions generated. The CV may already be well-aligned.
          </Trans>
        </p>
      )}

      {result.suggestions.map((suggestion, i) => (
        <SuggestionCard
          key={i}
          suggestion={suggestion}
          status={statuses[i]}
          onAccept={() => onAccept(i, suggestion)}
          onDismiss={() => onDismiss(i)}
        />
      ))}
    </div>
  );
}

function SuggestionCard({
  suggestion,
  status,
  onAccept,
  onDismiss,
}: {
  suggestion: Suggestion;
  status?: SuggestionStatus;
  onAccept: () => void;
  onDismiss: () => void;
}) {
  const cv = useCVStore((s) => s.activeCv());
  if (!cv) return null;

  const label = sectionLabelOf(cv, suggestion);

  if (status === "accepted") {
    return (
      <div className="p-3 rounded border border-green-200 bg-green-50/50 opacity-70">
        <div className="flex items-center gap-2 text-xs text-green-700">
          <Check size={14} />
          <span className="font-medium">{label}</span>
          <span>
            <Trans>- Applied</Trans>
          </span>
        </div>
      </div>
    );
  }

  if (status === "dismissed") {
    return (
      <div className="p-3 rounded border border-gray-200 bg-gray-50 opacity-50">
        <div className="flex items-center gap-2 text-xs text-muted">
          <X size={14} />
          <span className="font-medium">{label}</span>
          <span>
            <Trans>- Dismissed</Trans>
          </span>
        </div>
      </div>
    );
  }

  const resolution = resolveSuggestion(cv, suggestion);
  const current = currentTextOf(cv, suggestion);
  const suggested = suggestedTextOf(suggestion);

  return (
    <div className="p-3 rounded border border-accent/30 bg-accent/5 space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-semibold text-accent uppercase tracking-wide">
          {label}
        </span>
        <span className="text-xs text-muted">({opLabel(suggestion.op)})</span>
      </div>

      {suggestion.reason && (
        <p className="text-xs text-muted">{suggestion.reason}</p>
      )}

      {current && (
        <div className="text-sm">
          <p className="text-xs font-medium text-gray-500 mb-0.5">
            <Trans>Current:</Trans>
          </p>
          <p className="text-primary/60 line-through">{current}</p>
        </div>
      )}

      {suggested && (
        <div className="text-sm">
          <p className="text-xs font-medium text-gray-500 mb-0.5">
            <Trans>Suggested:</Trans>
          </p>
          <p className="text-primary">{suggested}</p>
        </div>
      )}

      {!resolution.ok && (
        <p className="text-xs text-amber-600">
          {failureLabel(resolution.reason)}
        </p>
      )}

      <div className="flex gap-2 pt-1">
        <button
          onClick={onAccept}
          disabled={!resolution.ok}
          className="px-3 py-1 text-xs rounded bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Trans>Accept</Trans>
        </button>
        <button
          onClick={onDismiss}
          className="px-3 py-1 text-xs rounded border border-gray-200 text-muted hover:text-primary transition-colors"
        >
          <Trans>Dismiss</Trans>
        </button>
      </div>
    </div>
  );
}
