import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { renderPdf } from "./renderPdf";
import {
  parsePdf,
  readBundledFontsFromDisk,
  type ParsedPdf,
  type PdfDestination,
  type PdfTextItem,
} from "./pdfTestUtils";
import { makeAtsCV, makeAtsCVTwoPages } from "../../test/fixtures";
import type {
  CV,
  EducationItem,
  ExperienceItem,
  Section,
  SectionType,
} from "../../types/cv";

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

/** Whitespace-free, lowercase form used for every search in the reading-order index. */
function key(text: string): string {
  return squash(text).toLowerCase();
}

/**
 * The whole text in pdf.js reading order, whitespace removed and lowercased, with each
 * character mapped back to the text item it came from. Positions are indexes into `text`.
 */
function readingIndex(pdf: ParsedPdf) {
  let text = "";
  const owner: PdfTextItem[] = [];
  for (const item of pdf.textItems) {
    for (const ch of item.str) {
      if (/\s/.test(ch)) continue;
      text += ch.toLowerCase();
      owner.push(item);
    }
  }
  return {
    find: (needle: string, from: number) => text.indexOf(key(needle), Math.max(from, 0)),
    itemAt: (at: number) => owner[at],
  };
}

function sameLine(a: PdfTextItem, b: PdfTextItem): boolean {
  return a.page === b.page && Math.abs(a.y - b.y) < 1;
}

function sectionOf(cv: CV, type: SectionType): Section {
  const found = cv.sections.find((s) => s.visible && s.type === type);
  if (!found) throw new Error(`fixture has no visible ${type} section`);
  return found;
}

/** A dated entry as the reader sees it: heading (role/degree), subline (company/institution), dates, first bullet or note. */
interface DatedEntry {
  heading: string;
  subline: string;
  dates: string;
  firstLine: string;
}

function experienceEntries(cv: CV): DatedEntry[] {
  return (sectionOf(cv, "experience").items as ExperienceItem[]).map((item) => ({
    heading: item.role,
    subline: [item.company, item.location].filter(Boolean).join(", "),
    dates: [item.startDate, item.endDate].filter(Boolean).join(" – "),
    firstLine: item.bullets.find(Boolean) ?? "",
  }));
}

function educationEntries(cv: CV): DatedEntry[] {
  return (sectionOf(cv, "education").items as EducationItem[]).map((item) => ({
    heading: item.degree,
    subline: item.institution,
    dates: item.dates,
    firstLine: item.notes ?? "",
  }));
}

/**
 * The layout rule for dated entries, checked in pdf.js reading order. For each section, in
 * document order: the heading sits on its own line, the dates sit on the subline after it
 * (on the same line as the subline), and the entry's first bullet or note comes last.
 */
function expectDatedEntries(
  pdf: ParsedPdf,
  sections: { title: string; entries: DatedEntry[] }[],
) {
  const reading = readingIndex(pdf);
  let cursor = 0;
  for (const section of sections) {
    cursor = reading.find(section.title, cursor);
    expect(cursor, `section heading "${section.title}"`).toBeGreaterThanOrEqual(0);
    for (const entry of section.entries) {
      const headingAt = reading.find(entry.heading, cursor);
      expect(headingAt, `heading "${entry.heading}"`).toBeGreaterThanOrEqual(0);
      const sublineAt = reading.find(entry.subline, headingAt);
      expect(sublineAt, `subline "${entry.subline}"`).toBeGreaterThan(headingAt);
      const datesAt = reading.find(entry.dates, sublineAt);
      expect(datesAt, `dates "${entry.dates}" after "${entry.subline}"`).toBeGreaterThan(sublineAt);
      expect(
        sameLine(reading.itemAt(datesAt), reading.itemAt(sublineAt)),
        `dates "${entry.dates}" on the subline line`,
      ).toBe(true);
      expect(
        sameLine(reading.itemAt(headingAt), reading.itemAt(sublineAt)),
        `heading "${entry.heading}" on its own line`,
      ).toBe(false);
      const firstAt = reading.find(entry.firstLine, datesAt);
      expect(firstAt, `first line "${entry.firstLine}" after its dates`).toBeGreaterThan(datesAt);
      cursor = firstAt;
    }
  }
}

/** Titles of a tree, with its shape kept: the comparison unit for outlines. */
interface TitleTree {
  title: string;
  children: TitleTree[];
}

function titleTree<T extends { title: string; children: T[] }>(nodes: T[]): TitleTree[] {
  return nodes.map((node) => ({ title: node.title, children: titleTree(node.children) }));
}

/** Pre-order walk: the order entries appear on the page. */
function preorder<T extends { children: T[] }>(nodes: T[]): T[] {
  return nodes.flatMap((node) => [node, ...preorder(node.children)]);
}

/** Outline entries a visible section gets: a role per experience item, a degree per education item. */
function childTitles(section: Section): string[] {
  if (section.type === "experience") {
    return (section.items as ExperienceItem[]).map((item) => item.role).filter(Boolean);
  }
  if (section.type === "education") {
    return (section.items as EducationItem[]).map((item) => item.degree).filter(Boolean);
  }
  return [];
}

/** The outline the CV should produce. Section headings are set in capitals, so the entry is too. */
function expectedOutline(cv: CV): TitleTree[] {
  return cv.sections
    .filter((section) => section.visible)
    .map((section) => ({
      title: section.title.toUpperCase(),
      children: childTitles(section).map((title) => ({ title, children: [] })),
    }));
}

/**
 * Finds each text in reading order. Each search starts after the previous match, so a
 * name that also appears in the header (the job title) resolves to its section entry.
 */
function locateInOrder(pdf: ParsedPdf, texts: string[]): PdfTextItem[] {
  let from = 0;
  return texts.map((text) => {
    const at = pdf.textItems.findIndex((item, i) => i >= from && item.str.includes(text));
    if (at < 0) throw new Error(`"${text}" is not on the page after the previous match`);
    from = at + 1;
    return pdf.textItems[at];
  });
}

/** Destinations land at the top of the heading text. pdf.js reports a text item at its baseline. */
const DEST_Y_TOLERANCE = 2;
const DEST_X_TOLERANCE = 0.5;

function headingTop(item: PdfTextItem): number {
  return item.y + item.height;
}

/** A destination must sit on the heading's page, at its top, on the left margin. */
function expectDestinationOnHeading(
  dest: PdfDestination | null,
  heading: PdfTextItem,
  label: string,
) {
  expect(dest?.page, `${label}: page`).toBe(heading.page);
  expect(Math.abs((dest?.y ?? NaN) - headingTop(heading)), `${label}: y`).toBeLessThanOrEqual(
    DEST_Y_TOLERANCE,
  );
  expect(Math.abs((dest?.x ?? NaN) - MARGIN), `${label}: x`).toBeLessThanOrEqual(
    DEST_X_TOLERANCE,
  );
}

function expectOutlineDestinations(pdf: ParsedPdf, cv: CV) {
  const entries = preorder(pdf.outline);
  const headings = locateInOrder(pdf, preorder(expectedOutline(cv)).map((e) => e.title));
  expect(entries).toHaveLength(headings.length);
  entries.forEach((entry, i) => {
    expectDestinationOnHeading(entry.dest, headings[i], `outline "${entry.title}"`);
  });
}

function expectNamedDestinations(pdf: ParsedPdf, cv: CV) {
  const visible = cv.sections.filter((section) => section.visible);
  const headings = locateInOrder(pdf, visible.map((section) => section.title.toUpperCase()));
  // Keys come from the stable section id, never the title (titles can be edited or duplicated).
  expect(Object.keys(pdf.namedDestinations).sort()).toEqual(visible.map((s) => s.id).sort());
  visible.forEach((section, i) => {
    expectDestinationOnHeading(
      pdf.namedDestinations[section.id] ?? null,
      headings[i],
      `named destination ${section.id}`,
    );
  });
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

  it("keeps each experience and education date with its entry, on the subline after the heading", () => {
    const cv = makeAtsCV({ settings: { fontFamily } });
    expectDatedEntries(pdf, [
      { title: sectionOf(cv, "experience").title, entries: experienceEntries(cv) },
      { title: sectionOf(cv, "education").title, entries: educationEntries(cv) },
    ]);
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
  it("lists each visible section as a top-level outline entry, in order, as printed", () => {
    const cv = makeAtsCV({ settings: { fontFamily } });
    expect(pdf.outline.map((node) => node.title)).toEqual(
      expectedOutline(cv).map((node) => node.title),
    );
  });

  it("nests experience roles and education degrees under their section", () => {
    const cv = makeAtsCV({ settings: { fontFamily } });
    expect(titleTree(pdf.outline)).toEqual(expectedOutline(cv));
    const children = Object.fromEntries(pdf.outline.map((node) => [node.title, node.children]));
    expect(children["PROFESSIONAL EXPERIENCE"].map((node) => node.title)).toEqual([
      "Senior Platform Engineer",
      "Backend Engineer",
    ]);
    expect(children["EDUCATION"].map((node) => node.title)).toEqual([
      "MSc Distributed Systems",
    ]);
  });

  it("omits the hidden section and keeps the empty visible one", () => {
    const titles = preorder(pdf.outline).map((node) => node.title);
    expect(titles).not.toContain("PUBLICATIONS");
    const certifications = pdf.outline.find((node) => node.title === "CERTIFICATIONS");
    expect(certifications).toBeDefined();
    expect(certifications?.children).toEqual([]);
  });

  it("points each outline entry at its heading: same page, top of text, left margin", () => {
    expectOutlineDestinations(pdf, makeAtsCV({ settings: { fontFamily } }));
  });

  it("names every visible section by its id, on the page its heading is on", () => {
    expectNamedDestinations(pdf, makeAtsCV({ settings: { fontFamily } }));
  });

  it("does not open the outline panel by default", () => {
    // pdfmake sets /PageMode /UseOutlines whenever bookmarks exist. The patch removes it.
    expect(pdf.pageMode).not.toBe("UseOutlines");
    expect(rawBytes).not.toMatch(/\/PageMode\s*\/UseOutlines/);
  });
});

describe.each(families)("two-page outline and destinations with %s", (fontFamily) => {
  let pdf: ParsedPdf;
  const cv = makeAtsCVTwoPages({ settings: { fontFamily } });

  beforeAll(async () => {
    pdf = await parsePdf(await renderPdf(cv, { fontSource }));
  });

  afterAll(async () => {
    await pdf.destroy();
  });

  it("renders onto a second page", () => {
    expect(pdf.pageCount).toBe(2);
  });

  it("points every outline entry at its heading on the page it is printed on", () => {
    expectOutlineDestinations(pdf, cv);
    // Some experience entries sit on page two, so their bookmarks must resolve there.
    const pages = preorder(pdf.outline).map((node) => node.dest?.page);
    expect(pages).toContain(0);
    expect(pages).toContain(1);
  });

  it("names every visible section on its heading's page", () => {
    expectNamedDestinations(pdf, cv);
  });
});
