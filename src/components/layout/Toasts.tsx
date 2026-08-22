import { useEffect } from "react";
import { X, Check, AlertTriangle, CircleAlert } from "lucide-react";
import { useUIStore, type Toast } from "../../store/uiStore";

const AUTO_DISMISS_MS = 8000;

const toneStyles = {
  success: "border-green-200 bg-green-50 text-green-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  error: "border-red-200 bg-red-50 text-red-700",
} as const;

function ToastIcon({ tone }: { tone: Toast["tone"] }) {
  if (tone === "success") return <Check size={15} className="shrink-0 mt-0.5" />;
  if (tone === "warning")
    return <AlertTriangle size={15} className="shrink-0 mt-0.5" />;
  return <CircleAlert size={15} className="shrink-0 mt-0.5" />;
}

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useUIStore((s) => s.dismissToast);

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, dismiss]);

  return (
    <div
      role="status"
      className={`flex items-start gap-2 px-3 py-2.5 rounded-lg border shadow-sm text-sm ${toneStyles[toast.tone]}`}
    >
      <ToastIcon tone={toast.tone} />
      <div className="flex-1 space-y-1">
        <p>{toast.message}</p>
        {toast.action && (
          <button
            onClick={() => {
              toast.action?.run();
              dismiss(toast.id);
            }}
            className="text-xs font-medium underline underline-offset-2 hover:no-underline"
          >
            {toast.action.label}
          </button>
        )}
      </div>
      <button
        onClick={() => dismiss(toast.id)}
        aria-label="Dismiss"
        className="opacity-60 hover:opacity-100 transition-opacity"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export function Toasts() {
  const toasts = useUIStore((s) => s.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-[60] flex flex-col gap-2 w-[min(22rem,calc(100vw-2rem))]">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
