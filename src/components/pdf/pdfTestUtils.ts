/// <reference types="node" />
// Test-only helpers. Nothing in the app imports this file.
//
// parsePdf() reads PDF bytes the way an ATS or a reader does (pdf.js), so tests
// assert on extracted text, positions, outline, destinations, annotations and
// the page drawing operators instead of on the pdfmake definition.
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  getDocument,
  OPS,
  type PDFDocumentProxy,
  type PDFPageProxy,
} from "pdfjs-dist/legacy/build/pdf.mjs";
import type { FontFiles } from "./renderPdf";

// ── Font source for node ───────────────────────────────────

const FONT_DIR = fileURLToPath(new URL("../../assets/fonts/", import.meta.url));

/** Reads the app's bundled Inter and Lora TTFs from src/assets/fonts. */
export async function readBundledFontsFromDisk(): Promise<FontFiles> {
  const names = [
    "Inter-Regular.ttf",
    "Inter-Bold.ttf",
    "Lora-Regular.ttf",
    "Lora-Bold.ttf",
  ];
  const files = await Promise.all(
    names.map(async (name) => [name, new Uint8Array(await readFile(FONT_DIR + name))] as const),
  );
  return Object.fromEntries(files);
}

// ── Parsed view ────────────────────────────────────────────

type TextRun = Extract<
  Awaited<ReturnType<PDFPageProxy["getTextContent"]>>["items"][number],
  { str: string }
>;

/** A text run as pdf.js reports it. `page` is the 0-based page index. */
export interface PdfTextItem {
  str: string;
  x: number;
  y: number;
  page: number;
  fontName: string;
  width: number;
  height: number;
  hasEOL: boolean;
}

/** Resolved explicit destination. x/y are null for fit-type destinations. */
export interface PdfDestination {
  page: number;
  x: number | null;
  y: number | null;
}

interface PdfOutlineNode {
  title: string;
  /** Resolved destination, or null when the bookmark has no internal destination. */
  dest: PdfDestination | null;
  url: string | null;
  children: PdfOutlineNode[];
}

interface PdfLinkAnnotation {
  /** 0-based page index. */
  page: number;
  url: string;
  /** [x1, y1, x2, y2] in PDF user space. */
  rect: [number, number, number, number];
}

interface PdfOperator {
  /** Operator name as pdf.js names it, e.g. "constructPath", "showText". */
  name: string;
  args: unknown[];
}

export interface ParsedPdf {
  pageCount: number;
  /** Version from the %PDF- header, e.g. "1.7". */
  version: string;
  /** The /Info dictionary as pdf.js reads it (Title, Author, Subject, ...). */
  info: Record<string, unknown>;
  /** Every text run, all pages, in reading order per page. */
  textItems: PdfTextItem[];
  /** Text of one page: runs joined in order, a newline after each line end. */
  pageText(pageIndex: number): string;
  /** All pages, joined with newlines. */
  text: string;
  outline: PdfOutlineNode[];
  /** Named destinations (pdf.js getDestinations), resolved to positions. */
  namedDestinations: Record<string, PdfDestination>;
  /** Every link annotation on every page. */
  links: PdfLinkAnnotation[];
  /** Catalog /MarkInfo as pdf.js reports it, or null when absent. */
  markInfo: Awaited<ReturnType<PDFDocumentProxy["getMarkInfo"]>>;
  /** Catalog /PageMode name, e.g. "UseOutlines" or "UseNone". */
  pageMode: string;
  /**
   * Raw value of a key on the catalog dictionary (e.g. "Lang" returns the
   * string inside parentheses). pdf.js has no public accessor for it. Reads
   * the uncompressed catalog object, which pdfkit writes.
   */
  catalogEntry(key: string): string | null;
  /** Drawing operators for one page. */
  operatorList(pageIndex: number): Promise<PdfOperator[]>;
  destroy(): Promise<void>;
}

// ── Parsing ────────────────────────────────────────────────

function asDestinationArray(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

export async function parsePdf(bytes: Uint8Array): Promise<ParsedPdf> {
  // pdf.js transfers the buffer it is given, so hand it a copy.
  const loading = getDocument({
    data: new Uint8Array(bytes),
    verbosity: 0,
    useSystemFonts: false,
    disableFontFace: true,
  });
  const doc = await loading.promise;

  const pages: PDFPageProxy[] = [];
  for (let i = 1; i <= doc.numPages; i++) pages.push(await doc.getPage(i));

  const textItems: PdfTextItem[] = [];
  const pageTexts: string[] = [];
  for (const [index, page] of pages.entries()) {
    const content = await page.getTextContent();
    let pageText = "";
    for (const item of content.items) {
      if (!("str" in item)) continue;
      const run = item as TextRun;
      textItems.push({
        str: run.str,
        x: run.transform[4],
        y: run.transform[5],
        page: index,
        fontName: run.fontName,
        width: run.width,
        height: run.height,
        hasEOL: run.hasEOL,
      });
      pageText += run.str + (run.hasEOL ? "\n" : "");
    }
    pageTexts.push(pageText);
  }

  const resolveDest = async (raw: unknown): Promise<PdfDestination | null> => {
    let array: unknown[] | null = null;
    if (typeof raw === "string") {
      array = asDestinationArray(await doc.getDestination(raw));
    } else {
      array = asDestinationArray(raw);
    }
    if (!array || array.length === 0) return null;
    const page = await doc.getPageIndex(array[0] as never);
    const kind = array[1] as { name?: string } | undefined;
    const fitsXY = kind?.name === "XYZ";
    return {
      page,
      x: fitsXY && typeof array[2] === "number" ? array[2] : null,
      y: fitsXY && typeof array[3] === "number" ? array[3] : null,
    };
  };

  type RawOutline = {
    title: string;
    dest: unknown;
    url: string | null;
    items: RawOutline[];
  };
  const toOutline = async (nodes: RawOutline[]): Promise<PdfOutlineNode[]> =>
    Promise.all(
      nodes.map(async (node) => ({
        title: node.title,
        dest: await resolveDest(node.dest),
        url: node.url,
        children: await toOutline(node.items),
      })),
    );
  const rawOutline = ((await doc.getOutline()) ?? []) as RawOutline[];
  const outline = await toOutline(rawOutline);

  const namedDestinations: Record<string, PdfDestination> = {};
  const destinations = await doc.getDestinations();
  for (const [name, value] of destinations) {
    const resolved = await resolveDest(value);
    if (resolved) namedDestinations[name] = resolved;
  }

  const links: PdfLinkAnnotation[] = [];
  for (const [index, page] of pages.entries()) {
    for (const annotation of await page.getAnnotations()) {
      if (annotation.subtype !== "Link") continue;
      const url = annotation.url ?? annotation.unsafeUrl;
      if (!url) continue;
      const r = annotation.rect as number[];
      links.push({ page: index, url, rect: [r[0], r[1], r[2], r[3]] });
    }
  }

  const metadata = await doc.getMetadata();
  const header = new TextDecoder("latin1").decode(bytes.subarray(0, 16));
  const version = /%PDF-(\d+\.\d+)/.exec(header)?.[1] ?? "";

  const raw = new TextDecoder("latin1").decode(bytes);
  const catalogEntry = (key: string): string | null => {
    const at = raw.indexOf("/Type /Catalog");
    if (at === -1) return null;
    const start = raw.lastIndexOf(" obj", at);
    const end = raw.indexOf("endobj", at);
    const body = raw.slice(start, end === -1 ? undefined : end);
    const match = new RegExp(`/${key}\\s*\\(([^)]*)\\)`).exec(body);
    return match ? match[1] : null;
  };

  return {
    pageCount: doc.numPages,
    version,
    info: (metadata.info ?? {}) as Record<string, unknown>,
    textItems,
    pageText: (pageIndex) => pageTexts[pageIndex] ?? "",
    text: pageTexts.join("\n"),
    outline,
    namedDestinations,
    links,
    markInfo: await doc.getMarkInfo(),
    pageMode: await doc.getPageMode(),
    catalogEntry,
    operatorList: async (pageIndex) => {
      const list = await pages[pageIndex].getOperatorList();
      const names = new Map<number, string>();
      for (const [name, code] of Object.entries(OPS)) names.set(code, name);
      return list.fnArray.map((fn, i) => ({
        name: names.get(fn) ?? `op${fn}`,
        args: (list.argsArray[i] ?? []) as unknown[],
      }));
    },
    destroy: () => loading.destroy(),
  };
}
