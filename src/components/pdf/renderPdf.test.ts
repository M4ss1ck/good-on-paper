import { describe, it, expect } from "vitest";
import { renderPdf } from "./renderPdf";
import { parsePdf, readBundledFontsFromDisk } from "./pdfTestUtils";
import { makeAtsCV, makeAtsCVTwoPages } from "../../test/fixtures";
import type { CV } from "../../types/cv";

// Smoke checks only. Later units add text, link, bullet, date, metadata and outline assertions.
const fontSource = readBundledFontsFromDisk;
const families: CV["settings"]["fontFamily"][] = ["Roboto", "Inter", "Lora"];

describe.each(families)("renderPdf with %s", (fontFamily) => {
  it("renders the ATS fixture as a PDF whose text keeps the accented name", async () => {
    const bytes = await renderPdf(makeAtsCV({ settings: { fontFamily } }), { fontSource });
    const pdf = await parsePdf(bytes);
    try {
      expect(pdf.pageCount).toBeGreaterThanOrEqual(1);
      expect(pdf.textItems.map((item) => item.str)).toContain("José Martínez-Ñúñez");
    } finally {
      await pdf.destroy();
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
