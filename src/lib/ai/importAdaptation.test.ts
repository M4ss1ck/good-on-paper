import { describe, it, expect } from "vitest";
import {
  importAdaptation,
  isAdaptationEnvelope,
  adaptedCVName,
} from "./importAdaptation";
import { fingerprintCV } from "./adaptableCV";
import { makeCV } from "../../test/fixtures";
import type { CV } from "../../types/cv";

const source = makeCV();
const resolve = (cvId: string): CV | null => (cvId === source.id ? source : null);

function envelope(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    schemaVersion: 1,
    source: { cvId: "cv-1", fingerprint: fingerprintCV(source) },
    target: { position: "Platform Engineer", company: "Globex" },
    cv: {
      meta: { title: "Platform Engineer", location: "Madrid" },
      sections: [
        {
          id: "sec-summary",
          type: "summary",
          title: "Summary",
          items: [{ id: "item-summary", content: "Platform engineer." }],
        },
        {
          id: "sec-exp",
          type: "experience",
          title: "Professional Experience",
          items: [
            {
              id: "item-exp",
              role: "Engineer",
              company: "Acme",
              location: "Remote",
              startDate: "2020",
              endDate: "Present",
              bullets: ["Ran Kubernetes deployments."],
            },
          ],
        },
      ],
    },
    ...overrides,
  });
}

function expectOk(json: string) {
  const result = importAdaptation(json, resolve, "Adapted");
  if (result.kind !== "ok") {
    throw new Error(`expected ok, got ${result.kind}: ${JSON.stringify(result)}`);
  }
  return result;
}

describe("isAdaptationEnvelope", () => {
  it("distinguishes an envelope from a plain CV export", () => {
    expect(isAdaptationEnvelope(JSON.parse(envelope()))).toBe(true);
    expect(isAdaptationEnvelope(makeCV())).toBe(false);
  });
});

describe("importAdaptation", () => {
  it("parses a valid adaptation", () => {
    const { cv, warnings } = expectOk(envelope());
    expect(warnings).toEqual([]);
    expect(cv.name).toBe("Platform Engineer - Globex");
    expect(cv.meta.title).toBe("Platform Engineer");
  });

  it("rejects an unsupported schemaVersion", () => {
    const result = importAdaptation(
      envelope({ schemaVersion: 2 }),
      resolve,
      "Adapted",
    );
    expect(result.kind).toBe("unsupported-version");
    if (result.kind === "unsupported-version") {
      expect(result.version).toBe("2");
    }
  });

  it("rejects a missing schemaVersion", () => {
    const result = importAdaptation(
      JSON.stringify({ cv: { meta: {}, sections: [] } }),
      resolve,
      "Adapted",
    );
    expect(result.kind).toBe("unsupported-version");
  });

  it("rejects text that isn't JSON", () => {
    expect(importAdaptation("not json", resolve, "Adapted").kind).toBe("not-json");
  });

  it("rejects a malformed CV payload with field paths", () => {
    const result = importAdaptation(
      envelope({ cv: { meta: { title: "x" }, sections: "all of them" } }),
      resolve,
      "Adapted",
    );
    if (result.kind !== "invalid") throw new Error("expected invalid");
    expect(result.issues.join(" ")).toContain("cv.sections");
  });

  it("rejects an unknown section type", () => {
    const bad = JSON.parse(envelope());
    bad.cv.sections[0].type = "references";
    const result = importAdaptation(JSON.stringify(bad), resolve, "Adapted");
    expect(result.kind).toBe("invalid");
  });

  it("creates a new CV without mutating the source", () => {
    const before = JSON.stringify(source);
    const { cv } = expectOk(envelope());

    expect(JSON.stringify(source)).toBe(before);
    expect(cv.id).not.toBe(source.id);
    expect(cv.parentId).toBe(source.id);
    expect(cv.createdAt).not.toBe(source.createdAt);
  });

  it("inherits contact details, settings and hidden sections from the source", () => {
    const { cv } = expectOk(envelope());
    expect(cv.meta.name).toBe("Ada Lovelace");
    expect(cv.meta.email).toBe("ada@example.com");
    expect(cv.meta.links).toEqual(source.meta.links);
    expect(cv.settings.fontFamily).toBe("Inter");

    const hidden = cv.sections.find((s) => s.id === "sec-hidden");
    expect(hidden?.visible).toBe(false);
    expect(hidden?.items[0].id).toBe("item-edu");
  });

  it("keeps carried-over ids and mints ids for new nodes", () => {
    const withNew = JSON.parse(envelope());
    withNew.cv.sections.push({
      type: "custom",
      title: "Projects",
      items: [{ content: "A project." }],
    });
    const { cv } = expectOk(JSON.stringify(withNew));

    expect(cv.sections.map((s) => s.id)).toContain("sec-exp");
    const created = cv.sections.find((s) => s.title === "Projects");
    expect(created?.id).toBeTruthy();
    expect(created?.id).not.toBe("sec-exp");
    expect(created?.items[0].id).toBeTruthy();
  });

  it("never reuses an id the model repeated", () => {
    const duped = JSON.parse(envelope());
    duped.cv.sections[1].id = "sec-summary";
    const { cv } = expectOk(JSON.stringify(duped));
    const ids = cv.sections.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("keeps the original dates and warns when the model changed them", () => {
    const tampered = JSON.parse(envelope());
    tampered.cv.sections[1].items[0].startDate = "2014";
    const { cv, warnings } = expectOk(JSON.stringify(tampered));

    const exp = cv.sections.find((s) => s.id === "sec-exp");
    expect((exp?.items[0] as { startDate: string }).startDate).toBe("2020");
    expect(warnings).toContain("dates-changed");
  });

  it("warns when the source CV changed after the prompt was generated", () => {
    const stale = JSON.parse(envelope());
    stale.source.fingerprint = "deadbeef";
    const { warnings } = expectOk(JSON.stringify(stale));
    expect(warnings).toContain("stale-source");
  });

  it("still imports when the source CV is gone", () => {
    const result = importAdaptation(envelope(), () => null, "Adapted");
    if (result.kind !== "ok") throw new Error("expected ok");
    expect(result.warnings).toContain("missing-source");
    expect(result.cv.parentId).toBeNull();
    expect(result.cv.meta.email).toBe("");
  });
});

describe("adaptedCVName", () => {
  it("uses position and company when both are known", () => {
    expect(adaptedCVName({ position: "SRE", company: "Globex" }, "My CV", "Adapted"))
      .toBe("SRE - Globex");
  });

  it("falls back through company, then the source name", () => {
    expect(adaptedCVName({ company: "Globex" }, "My CV", "Adapted")).toBe(
      "My CV - Globex",
    );
    expect(adaptedCVName({ position: "SRE" }, "My CV", "Adapted")).toBe("SRE");
    expect(adaptedCVName({}, "My CV", "Adapted")).toBe("My CV (Adapted)");
    expect(adaptedCVName({ position: null, company: null }, "My CV", "Adaptado"))
      .toBe("My CV (Adaptado)");
  });

  it("truncates an absurdly long name", () => {
    const name = adaptedCVName(
      { position: "x".repeat(200), company: "y".repeat(200) },
      "My CV",
      "Adapted",
    );
    expect(name.length).toBeLessThanOrEqual(80);
  });
});
