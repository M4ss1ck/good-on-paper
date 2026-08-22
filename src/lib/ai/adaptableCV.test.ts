import { describe, it, expect } from "vitest";
import {
  toAdaptableCV,
  canonicalize,
  fingerprintCV,
  hashString,
} from "./adaptableCV";
import { makeCV } from "../../test/fixtures";

describe("toAdaptableCV", () => {
  it("keeps adaptable content and ids", () => {
    const adaptable = toAdaptableCV(makeCV());
    expect(adaptable.meta).toEqual({
      title: "Backend Engineer",
      location: "Madrid",
    });
    expect(adaptable.sections.map((s) => s.id)).toEqual([
      "sec-summary",
      "sec-skills",
      "sec-exp",
    ]);
    expect(adaptable.sections[2].items[0].bullets).toEqual([
      "Built services.",
      "Ran deployments.",
    ]);
  });

  it("drops hidden sections", () => {
    const adaptable = toAdaptableCV(makeCV());
    expect(adaptable.sections.some((s) => s.id === "sec-hidden")).toBe(false);
  });

  it("never exposes PII", () => {
    const json = JSON.stringify(toAdaptableCV(makeCV()));
    expect(json).not.toContain("ada@example.com");
    expect(json).not.toContain("Ada Lovelace");
    expect(json).not.toContain("github.com/ada");
  });
});

describe("canonicalize", () => {
  it("is insensitive to key order", () => {
    expect(canonicalize({ a: 1, b: [2, { c: 3, d: 4 }] })).toBe(
      canonicalize({ b: [2, { d: 4, c: 3 }], a: 1 }),
    );
  });

  it("is sensitive to array order", () => {
    expect(canonicalize([1, 2])).not.toBe(canonicalize([2, 1]));
  });
});

describe("fingerprintCV", () => {
  it("is stable for identical content", () => {
    expect(fingerprintCV(makeCV())).toBe(fingerprintCV(makeCV()));
  });

  it("changes when adaptable content changes", () => {
    const edited = makeCV();
    edited.meta.title = "Platform Engineer";
    expect(fingerprintCV(edited)).not.toBe(fingerprintCV(makeCV()));
  });

  it("ignores fields the model never sees", () => {
    const renamed = makeCV();
    renamed.name = "A different CV name";
    renamed.updatedAt = "2030-01-01T00:00:00.000Z";
    renamed.meta.email = "someone.else@example.com";
    expect(fingerprintCV(renamed)).toBe(fingerprintCV(makeCV()));
  });

  it("changes when a hidden section is revealed", () => {
    const revealed = makeCV();
    revealed.sections[3].visible = true;
    expect(fingerprintCV(revealed)).not.toBe(fingerprintCV(makeCV()));
  });

  it("produces 8 hex characters", () => {
    expect(hashString("anything")).toMatch(/^[0-9a-f]{8}$/);
    expect(hashString("")).toMatch(/^[0-9a-f]{8}$/);
  });
});
