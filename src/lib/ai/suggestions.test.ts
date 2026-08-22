import { describe, it, expect } from "vitest";
import {
  parseTailorResponse,
  resolveSuggestion,
  bulletIndexOf,
  currentTextOf,
} from "./suggestions";
import type { Suggestion } from "../schemas/adaptation";
import { makeCV } from "../../test/fixtures";

function ok(raw: string) {
  const result = parseTailorResponse(raw);
  if (result.kind !== "ok") throw new Error(`expected ok, got ${result.kind}`);
  return result;
}

describe("parseTailorResponse", () => {
  it("parses a well-formed response", () => {
    const result = ok(
      JSON.stringify({
        target: { position: "Platform Engineer", company: "Globex" },
        suggestions: [
          {
            op: "replace_summary",
            sectionId: "sec-summary",
            itemId: "item-summary",
            current: "Backend engineer.",
            suggested: "Platform engineer.",
            reason: "Matches the offer",
          },
        ],
      }),
    );
    expect(result.target?.company).toBe("Globex");
    expect(result.suggestions).toHaveLength(1);
    expect(result.skipped).toBe(0);
  });

  it("tolerates markdown fences", () => {
    const result = ok('```json\n{"suggestions":[]}\n```');
    expect(result.suggestions).toEqual([]);
  });

  it("reports non-JSON output instead of throwing", () => {
    const result = parseTailorResponse("Sure! Here are some ideas:");
    expect(result.kind).toBe("not-json");
  });

  it("reports a wrong-shaped response with field paths", () => {
    const result = parseTailorResponse('{"suggestions":"lots"}');
    if (result.kind !== "bad-shape") throw new Error("expected bad-shape");
    expect(result.issues.join(" ")).toContain("suggestions");
  });

  it("keeps valid suggestions and counts malformed ones", () => {
    const result = ok(
      JSON.stringify({
        suggestions: [
          {
            op: "replace_summary",
            sectionId: "sec-summary",
            itemId: "item-summary",
            suggested: "New summary.",
          },
          { op: "explode_cv", sectionId: "sec-summary" },
          { op: "replace_bullet", sectionId: "sec-exp" },
        ],
      }),
    );
    expect(result.suggestions).toHaveLength(1);
    expect(result.skipped).toBe(2);
  });

  it("never applies an unsupported op", () => {
    const result = ok(
      JSON.stringify({
        suggestions: [{ op: "delete_section", sectionId: "sec-exp" }],
      }),
    );
    expect(result.suggestions).toHaveLength(0);
    expect(result.skipped).toBe(1);
  });
});

describe("resolveSuggestion", () => {
  const cv = makeCV();

  const bullet: Suggestion = {
    op: "replace_bullet",
    sectionId: "sec-exp",
    itemId: "item-exp",
    bulletIndex: 1,
    current: "Ran deployments.",
    suggested: "Owned deployments.",
    reason: "",
  };

  it("resolves a valid suggestion", () => {
    expect(resolveSuggestion(cv, bullet)).toEqual({ ok: true });
  });

  it("rejects a missing section", () => {
    expect(resolveSuggestion(cv, { ...bullet, sectionId: "nope" })).toEqual({
      ok: false,
      reason: "section-missing",
    });
  });

  it("rejects a missing item", () => {
    expect(resolveSuggestion(cv, { ...bullet, itemId: "nope" })).toEqual({
      ok: false,
      reason: "item-missing",
    });
  });

  it("rejects an out-of-range bullet", () => {
    expect(
      resolveSuggestion(cv, { ...bullet, bulletIndex: 9, current: null }),
    ).toEqual({ ok: false, reason: "bullet-missing" });
  });

  it("rejects an op aimed at the wrong section type", () => {
    expect(
      resolveSuggestion(cv, { ...bullet, sectionId: "sec-skills" }),
    ).toEqual({ ok: false, reason: "type-mismatch" });
  });

  it("finds a bullet by text when indexes have shifted", () => {
    const shifted = makeCV();
    const exp = shifted.sections[2].items[0] as { bullets: string[] };
    exp.bullets.unshift("A newly accepted bullet.");
    // bulletIndex 1 now points at the wrong bullet; the text still matches.
    expect(bulletIndexOf(shifted, bullet)).toBe(2);
    expect(currentTextOf(shifted, bullet)).toBe("Ran deployments.");
  });
});
