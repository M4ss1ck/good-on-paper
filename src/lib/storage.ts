import type { CV } from "../types/cv";

const STORAGE_KEY = "gop-cv";

export function loadCV(): CV | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CV;
  } catch {
    return null;
  }
}

export function saveCV(cv: CV): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cv));
}

export function createDebouncedSave(delay: number): (cv: CV) => void {
  let timer: ReturnType<typeof setTimeout>;
  return (cv: CV) => {
    clearTimeout(timer);
    timer = setTimeout(() => saveCV(cv), delay);
  };
}
