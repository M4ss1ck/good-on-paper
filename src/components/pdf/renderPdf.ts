import pdfMake from "pdfmake/build/pdfmake";
import pdfFonts from "pdfmake/build/vfs_fonts";
import type { CV } from "../../types/cv";
import { bundledFontUrls } from "../../lib/fonts";
import { generatePdfDefinition } from "./generatePdf";

/** Raw TTF bytes keyed by file name, e.g. "Inter-Regular.ttf". */
export type FontFiles = Record<string, Uint8Array>;

/**
 * Supplies the font files that are not built into pdfmake (Inter and Lora).
 * The app fetches its bundled copies; node tests read them from disk.
 */
export type FontSource = () => Promise<FontFiles>;

export interface RenderOptions {
  fontSource?: FontSource;
}

/** Fetches the TTF files the app ships (see lib/fonts.ts). Browser only. */
export const fetchBundledFonts: FontSource = async () => {
  const entries = await Promise.all(
    Object.entries(bundledFontUrls).map(async ([name, url]) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Failed to load font ${name}: HTTP ${res.status}`);
      return [name, new Uint8Array(await res.arrayBuffer())] as const;
    }),
  );
  return Object.fromEntries(entries);
};

type PdfMakeWithUrlPolicy = typeof pdfMake & {
  setUrlAccessPolicy(callback: (url: string) => boolean): void;
};

const fontFamilies = {
  Inter: {
    normal: "Inter-Regular.ttf",
    bold: "Inter-Bold.ttf",
    italics: "Inter-Regular.ttf",
    bolditalics: "Inter-Bold.ttf",
  },
  Lora: {
    normal: "Lora-Regular.ttf",
    bold: "Lora-Bold.ttf",
    italics: "Lora-Regular.ttf",
    bolditalics: "Lora-Bold.ttf",
  },
};

function toBase64(bytes: Uint8Array): string {
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// pdfmake keeps its fonts and virtual file system in module-level state, so
// registration runs once per font source. A failed load is retried next call.
const registrations = new WeakMap<FontSource, Promise<void>>();

function ensureFonts(source: FontSource): Promise<void> {
  let ready = registrations.get(source);
  if (!ready) {
    ready = source()
      .then((files) => {
        // Roboto ships inside pdfmake's own vfs_fonts bundle.
        pdfMake.addVirtualFileSystem(pdfFonts);
        pdfMake.addVirtualFileSystem(
          Object.fromEntries(Object.entries(files).map(([name, bytes]) => [name, toBase64(bytes)])),
        );
        pdfMake.addFonts(fontFamilies);
        // The CV contains no external resources. Refuse any URL fetch pdfmake might attempt.
        // Missing from @types/pdfmake; present in the runtime build.
        (pdfMake as PdfMakeWithUrlPolicy).setUrlAccessPolicy(() => false);
      })
      .catch((error: unknown) => {
        registrations.delete(source);
        throw error;
      });
    registrations.set(source, ready);
  }
  return ready;
}

/** Renders a CV to PDF bytes. Preview and download both call this so they match. */
export async function renderPdf(cv: CV, options: RenderOptions = {}): Promise<Uint8Array> {
  await ensureFonts(options.fontSource ?? fetchBundledFonts);
  const buffer = await pdfMake.createPdf(generatePdfDefinition(cv)).getBuffer();
  return new Uint8Array(buffer);
}

export function pdfBlob(bytes: Uint8Array): Blob {
  return new Blob([bytes as Uint8Array<ArrayBuffer>], { type: "application/pdf" });
}

/** Renders a CV and saves it through a temporary download link. */
export async function downloadPdf(cv: CV, fileName: string, options: RenderOptions = {}): Promise<void> {
  const url = URL.createObjectURL(pdfBlob(await renderPdf(cv, options)));
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
