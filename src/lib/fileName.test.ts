import { describe, it, expect } from "vitest";
import { fileBaseName, pdfFileName } from "./fileName";
import { makeCV } from "../test/fixtures";

const cv = (name: string, title: string, fullName: string) => {
  const base = makeCV({ name });
  return { ...base, meta: { ...base.meta, name: fullName, title } };
};

describe("pdfFileName", () => {
  it("names the file '{position} - {full name}'", () => {
    expect(pdfFileName(cv("My CV", "Backend Engineer", "Ada Lovelace"))).toBe(
      "Backend Engineer - Ada Lovelace.pdf",
    );
  });

  it("uses only the part that is filled in", () => {
    expect(pdfFileName(cv("My CV", "", "Ada Lovelace"))).toBe("Ada Lovelace.pdf");
    expect(pdfFileName(cv("My CV", "Backend Engineer", "  "))).toBe("Backend Engineer.pdf");
  });

  it("falls back to the CV name, then 'cv', when both are empty", () => {
    expect(pdfFileName(cv("Acme draft", "", ""))).toBe("Acme draft.pdf");
    expect(pdfFileName(cv("", "", ""))).toBe("cv.pdf");
  });

  it("strips characters that are not allowed in file names", () => {
    expect(pdfFileName(cv("", "C/C++ Dev: Lead", "Ada  Lovelace"))).toBe(
      "C-C++ Dev- Lead - Ada Lovelace.pdf",
    );
  });
});

describe("fileBaseName", () => {
  it("returns 'cv' for missing or blank names", () => {
    expect(fileBaseName(undefined)).toBe("cv");
    expect(fileBaseName("  ")).toBe("cv");
  });
});
