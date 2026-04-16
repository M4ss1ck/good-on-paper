import type { AIActionState } from "../../types/ai";

interface AIActionButtonProps {
  onClick: () => void;
  state: AIActionState;
  error: string | null;
  label: string;
  disabled?: boolean;
  disabledTitle?: string;
}

export function AIActionButton({
  onClick,
  state,
  error,
  label,
  disabled,
  disabledTitle,
}: AIActionButtonProps) {
  const isLoading = state === "loading";
  const isDisabled = disabled || isLoading;

  return (
    <div className="relative inline-block">
      <button
        onClick={onClick}
        disabled={isDisabled}
        title={disabled ? disabledTitle : undefined}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs rounded border border-gray-200 text-muted hover:text-primary hover:border-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <span className="inline-block w-3.5 h-3.5 border-2 border-gray-300 border-t-accent rounded-full animate-spin" />
        ) : (
          <span className="text-sm">✨</span>
        )}
        {label}
      </button>
      {state === "error" && error && (
        <div className="absolute top-full left-0 mt-1 px-2 py-1 text-xs text-red-600 bg-red-50 border border-red-200 rounded shadow-sm whitespace-nowrap z-10">
          {error}
        </div>
      )}
    </div>
  );
}
