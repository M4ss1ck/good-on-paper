import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { renderPdf } from "./renderPdf";
import { parsePdf, readBundledFontsFromDisk, type ParsedPdf } from "./pdfTestUtils";
import { makeAtsCV, makeAtsCVTwoPages } from "../../test/fixtures";
import type { CV, ExperienceItem } from "../../types/cv";

const fontSource = readBundledFontsFromDisk;
const families: CV["settings"]["fontFamily"][] = ["Roboto", "Inter", "Lora"];

const NAME = "José Martínez-Ñúñez";
const TITLE = "Senior Platform Engineer";

// Letter page, 50pt left and right margins (see generatePdf.ts pageMargins).
const PAGE_WIDTH = 612;
const MARGIN = 50;

/**
 * Joins extracted lines the way a reader rejoins a wrapped word: a hyphen at
 * the end of a line closes up with the next line, any other line end is a space.
 */
function joinWrappedLines(text: string): string {
  return text.replace(/-\n/g, "-").replace(/\n/g, " ");
}

/**
 * Horizontal two-point strokes on a page. pdf.js packs a path into one
 * constructPath buffer: op 0 (moveTo) then x, y, then op 1 (lineTo) then x, y.
 */
async function horizontalRules(pdf: ParsedPdf, pageIndex: number) {
  const rules: { startX: number; endX: number; y: number }[] = [];
  for (const op of await pdf.operatorList(pageIndex)) {
    if (op.name !== "constructPath") continue;
    // args[1] is a list of typed arrays; the path buffer is its first entry.
    const buffer = Array.from((op.args[1] as ArrayLike<number>[])[0] ?? []);
    if (buffer.length !== 6 || buffer[0] !== 0 || buffer[3] !== 1) continue;
    if (buffer[2] !== buffer[5]) continue;
    rules.push({ startX: buffer[1], endX: buffer[4], y: buffer[2] });
  }
  return rules;
}

/** Non-empty experience bullets of the fixture, in document order. Input-derived, not rendered. */
function expectedBullets(cv: CV): string[] {
  return cv.sections
    .filter((s) => s.visible && s.type === "experience")
    .flatMap((s) => (s.items as ExperienceItem[]).flatMap((item) => item.bullets))
    .filter(Boolean);
}

/** Drops all whitespace, so a bullet that wraps (or splits at a hyphen) still compares equal. */
function squash(text: string): string {
  return text.replace(/\s+/g, "");
}

describe.each(families)("renderPdf with %s", (fontFamily) => {
  let pdf: ParsedPdf;
  let rawBytes: string;

  beforeAll(async () => {
    const bytes = await renderPdf(makeAtsCV({ settings: { fontFamily } }), { fontSource });
    rawBytes = new TextDecoder("latin1").decode(bytes);
    pdf = await parsePdf(bytes);
  });

  afterAll(async () => {
    await pdf.destroy();
  });

  it("extracts C++, hyphenated words and the accented name intact", () => {
    const joined = joinWrappedLines(pdf.text);
    // "C++" also appears on the skills line, so the C++ check is scoped to the summary.
    const summary = joined.slice(joined.indexOf("SUMMARY"), joined.indexOf("TECHNICAL SKILLS"));
    expect(summary).toContain("C++");
    expect(summary).toContain("fault-tolerant");
    expect(summary).toContain("fleet-wide");
    expect(joined).toContain(NAME);
    // Justify splits words at hyphens and "+" and pads the gaps. A gap after a letter is that bug.
    expect(pdf.text).not.toMatch(/[A-Za-z]- /);
  });

  it("sets Title, Author, Subject, catalog Lang and PDF 1.7, with no custom lang key", () => {
    expect(pdf.info.Title).toBe(`${NAME} - ${TITLE}`);
    expect(pdf.info.Author).toBe(NAME);
    expect(pdf.info.Subject).toBe("Curriculum Vitae");
    expect(pdf.catalogEntry("Lang")).toBe("en");
    // pdf.js drops unknown Info keys, so the custom key is checked in the raw Info dictionary.
    expect(rawBytes).not.toMatch(/\/lang\b/);
    expect(pdf.version).toBe("1.7");
  });

  it("is not marked as tagged", () => {
    expect(pdf.markInfo?.Marked ?? false).toBe(false);
  });

  it("prints each linked URL without scheme or trailing slash and annotates the full URL", () => {
    // makeAtsCV header links: GitHub (label + URL), LinkedIn (URL only), Portfolio (label only).
    expect(pdf.text).toContain("github.com/jose");
    expect(pdf.text).toContain("www.linkedin.com/in/jose-martinez");
    expect(pdf.text).not.toContain("https://");
    const annotated = new Set(pdf.links.map((link) => link.url));
    expect(annotated).toEqual(
      new Set(["https://github.com/jose", "https://www.linkedin.com/in/jose-martinez/"]),
    );
  });

  it("prints a label-only link's label and adds no annotation for it", () => {
    expect(pdf.text).toContain("Portfolio");
    // Covered by the exact annotation set above: "Portfolio" must not appear as a URI.
    expect(pdf.links.map((link) => link.url)).not.toContain("Portfolio");
  });

  it("does not print the label of a link that has a URL", () => {
    expect(pdf.text).not.toContain("GitHub");
    expect(pdf.text).not.toContain("LinkedIn");
  });

  it("runs each section divider from the left margin to the right margin", async () => {
    const rules = await horizontalRules(pdf, 0);
    // One divider per visible section in makeAtsCV: summary, skills, experience,
    // education, languages, certifications. The hidden Publications section draws none.
    expect(rules).toHaveLength(6);
    for (const rule of rules) {
      expect(rule.startX).toBeCloseTo(MARGIN, 2);
      expect(rule.endX).toBeCloseTo(PAGE_WIDTH - MARGIN, 2);
    }
  });

  // pdf.js merges a bullet's "•" into the text item that follows it on the same line, so a
  // "•" item is one whose text starts with the glyph. Empty zero-width items are not bullets.
  const bulletItems = (pdf: ParsedPdf) =>
    pdf.textItems.flatMap((item, i) => (item.str.trimStart().startsWith("•") ? [i] : []));

  it("starts every non-empty bullet with a bullet glyph text item", () => {
    const bullets = expectedBullets(makeAtsCV({ settings: { fontFamily } }));
    expect(bullets.length).toBeGreaterThan(0);
    expect(bulletItems(pdf)).toHaveLength(bullets.length);
  });

  it("puts each bullet glyph immediately before its bullet text in reading order", () => {
    const bullets = expectedBullets(makeAtsCV({ settings: { fontFamily } }));
    const glyphIndexes = bulletItems(pdf);
    bullets.forEach((bullet, n) => {
      // Read forward from the n-th glyph item until the bullet's text is covered.
      const start = glyphIndexes[n];
      let read = pdf.textItems[start].str.trimStart().slice(1);
      for (let j = start + 1; j < pdf.textItems.length && squash(read).length < squash(bullet).length; j++) {
        read += pdf.textItems[j].str;
      }
      expect(squash(read).startsWith(squash(bullet))).toBe(true);
    });
  });

  it("titles an untitled CV with the name alone and takes Lang from the CV locale", async () => {
    const base = makeAtsCV({ settings: { fontFamily } });
    const variant = makeAtsCV({
      settings: { fontFamily },
      meta: { ...base.meta, title: "", locale: "de" },
    });
    const other = await parsePdf(await renderPdf(variant, { fontSource }));
    try {
      expect(other.info.Title).toBe(NAME);
      expect(other.catalogEntry("Lang")).toBe("de");
    } finally {
      await other.destroy();
    }
  });
});

// Once is enough for the two-page fixture: the per-font tests above cover the fonts.
it("renders the two-page fixture onto a second page", async () => {
  const bytes = await renderPdf(makeAtsCVTwoPages(), { fontSource });
  const pdf = await parsePdf(bytes);
  try {
    expect(pdf.pageCount).toBe(2);
  } finally {
    await pdf.destroy();
  }
});
