import { useRef, useState } from "react";
import { Upload, X, FileJson } from "lucide-react";
import { Trans } from "@lingui/react/macro";
import { t } from "@lingui/core/macro";
import { useCVStore } from "../../store/cvStore";
import { useUIStore } from "../../store/uiStore";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { cvSchema, formatIssues } from "../../lib/schemas/cv";
import {
  importAdaptation,
  isAdaptationEnvelope,
  type ImportWarning,
} from "../../lib/ai/importAdaptation";
import type { CV } from "../../types/cv";

interface ImportDialogProps {
  onClose: () => void;
}

function warningMessage(warning: ImportWarning): string {
  switch (warning) {
    case "missing-source":
      return t`The original CV no longer exists, so contact details and hidden sections couldn't be carried over.`;
    case "stale-source":
      return t`Your CV changed after this prompt was generated. Review the imported version carefully.`;
    case "dates-changed":
      return t`The AI tried to change some dates. The original dates were kept.`;
  }
}

export function ImportDialog({ onClose }: ImportDialogProps) {
  const importJson = useCVStore((s) => s.importJson);
  const insertAdaptedCV = useCVStore((s) => s.insertAdaptedCV);
  const pushToast = useUIStore((s) => s.pushToast);
  const setDiffRequest = useUIStore((s) => s.setDiffRequest);
  const trapRef = useFocusTrap<HTMLDivElement>(onClose);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [text, setText] = useState("");
  const [errorTitle, setErrorTitle] = useState<string | null>(null);
  const [issues, setIssues] = useState<string[]>([]);
  const [pendingRaw, setPendingRaw] = useState<string | null>(null);

  const clearErrors = () => {
    setErrorTitle(null);
    setIssues([]);
    setPendingRaw(null);
  };

  const fail = (title: string, details: string[] = []) => {
    setErrorTitle(title);
    setIssues(details);
    setPendingRaw(null);
  };

  const importAdapted = (raw: string) => {
    const result = importAdaptation(
      raw,
      (cvId) => useCVStore.getState().workspace.cvs[cvId] ?? null,
      t`Adapted`,
    );

    switch (result.kind) {
      case "not-json":
        fail(t`That file isn't valid JSON.`);
        return;
      case "unsupported-version":
        fail(
          t`Unsupported format version: ${result.version}. This file was made for a different version of Good on Paper.`,
        );
        return;
      case "invalid":
        fail(t`This adaptation file isn't valid. Nothing was imported.`, result.issues);
        return;
      case "ok": {
        const created = result.cv;
        insertAdaptedCV(created);
        for (const warning of result.warnings) {
          pushToast({ tone: "warning", message: warningMessage(warning) });
        }
        pushToast({
          tone: "success",
          message: t`Created "${created.name}"`,
          ...(created.parentId && {
            action: {
              label: t`Compare with original`,
              run: () =>
                setDiffRequest({
                  baseId: created.parentId!,
                  againstId: created.id,
                }),
            },
          }),
        });
        onClose();
      }
    }
  };

  const importNative = (raw: string, parsed: unknown) => {
    const result = cvSchema.safeParse(parsed);
    if (!result.success) {
      setErrorTitle(
        t`This file doesn't look like a complete Good on Paper CV. You can import it anyway, but parts of it may be missing.`,
      );
      setIssues(formatIssues(result.error));
      setPendingRaw(raw);
      return;
    }
    importJson(raw);
    pushToast({
      tone: "success",
      message: t`Imported "${(parsed as CV).name}"`,
    });
    onClose();
  };

  const handleImport = (raw: string) => {
    clearErrors();
    const trimmed = raw.trim();
    if (!trimmed) {
      fail(t`Nothing to import. Choose a file or paste some JSON.`);
      return;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(trimmed);
    } catch {
      fail(t`That isn't valid JSON.`);
      return;
    }

    if (isAdaptationEnvelope(parsed)) {
      importAdapted(trimmed);
    } else {
      importNative(trimmed, parsed);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setText(reader.result);
        handleImport(reader.result);
      }
    };
    reader.onerror = () => fail(t`Couldn't read that file.`);
    reader.readAsText(file);
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
        aria-labelledby="import-title"
        className="bg-white rounded-lg shadow-xl w-full max-w-lg mx-2 sm:mx-4 max-h-[85dvh] flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2
            id="import-title"
            className="text-lg font-semibold text-primary flex items-center gap-1.5"
          >
            <Upload size={18} />
            <Trans>Import JSON</Trans>
          </h2>
          <button
            onClick={onClose}
            aria-label={t`Close`}
            className="text-gray-400 hover:text-gray-600"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          <p className="text-sm text-muted">
            <Trans>
              Accepts a Good on Paper CV export, or an AI adaptation file
              produced from the Adapt my CV prompt.
            </Trans>
          </p>

          <div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 text-sm rounded border border-gray-200 text-primary hover:border-accent hover:text-accent transition-colors inline-flex items-center gap-2"
            >
              <FileJson size={14} />
              <Trans>Choose file</Trans>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFile}
            />
          </div>

          <div>
            <label
              htmlFor="import-paste"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              <Trans>Or paste the JSON</Trans>
            </label>
            <textarea
              id="import-paste"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder='{ "schemaVersion": 1, ... }'
              className="w-full border border-gray-200 rounded px-3 py-2 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent resize-y min-h-32"
              rows={8}
            />
          </div>

          {errorTitle && (
            <div className="p-3 text-sm bg-red-50 border border-red-200 rounded space-y-2">
              <p className="text-red-600">{errorTitle}</p>
              {issues.length > 0 && (
                <ul className="text-xs text-red-600 font-mono space-y-0.5">
                  {issues.slice(0, 10).map((issue, i) => (
                    <li key={i}>{issue}</li>
                  ))}
                  {issues.length > 10 && (
                    <li>
                      <Trans>and {issues.length - 10} more problems</Trans>
                    </li>
                  )}
                </ul>
              )}
              {pendingRaw && (
                <button
                  onClick={() => {
                    importJson(pendingRaw);
                    pushToast({ tone: "warning", message: t`Imported with problems` });
                    onClose();
                  }}
                  className="px-3 py-1 text-xs rounded border border-red-300 text-red-700 hover:bg-red-100 transition-colors"
                >
                  <Trans>Import anyway</Trans>
                </button>
              )}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 px-6 py-3 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded border border-gray-200 text-muted hover:text-primary transition-colors"
          >
            <Trans>Cancel</Trans>
          </button>
          <button
            onClick={() => handleImport(text)}
            disabled={!text.trim()}
            className="px-4 py-2 text-sm rounded bg-accent text-white hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trans>Import</Trans>
          </button>
        </div>
      </div>
    </div>
  );
}
