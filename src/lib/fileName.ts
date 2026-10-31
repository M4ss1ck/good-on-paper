import type { CV } from "../types/cv";

function sanitize(name: string): string {
  return name
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

/** Turns a CV name into a safe file base name. */
export function fileBaseName(name: string | undefined): string {
  return sanitize(name ?? "") || "cv";
}

/** "{position} - {full name}.pdf", dropping whichever part is empty; falls back to the CV name. */
export function pdfFileName(cv: CV): string {
  const base = [cv.meta.title, cv.meta.name].map(sanitize).filter(Boolean).join(" - ");
  return `${base || fileBaseName(cv.name)}.pdf`;
}
