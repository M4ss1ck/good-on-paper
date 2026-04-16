import { useEffect, useRef } from "react";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(onEscape?: () => void) {
  const ref = useRef<T>(null);
  const escapeRef = useRef(onEscape);
  useEffect(() => {
    escapeRef.current = onEscape;
  });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const prev = document.activeElement as HTMLElement | null;
    const first = el.querySelector<HTMLElement>(FOCUSABLE);
    first?.focus();

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        escapeRef.current?.();
        return;
      }
      if (e.key !== "Tab") return;
      const focusable = [...el.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (focusable.length === 0) return;

      const firstEl = focusable[0];
      const lastEl = focusable[focusable.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === firstEl) {
          e.preventDefault();
          lastEl.focus();
        }
      } else {
        if (document.activeElement === lastEl) {
          e.preventDefault();
          firstEl.focus();
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      prev?.focus();
    };
  }, []);

  return ref;
}
