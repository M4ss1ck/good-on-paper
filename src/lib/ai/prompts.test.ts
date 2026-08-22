import { describe, it, expect } from "vitest";
import { tailorToJobPrompt } from "./prompts";
import { buildHandoffPrompt } from "./handoffPrompt";
import { makeCV } from "../../test/fixtures";

const JOB_OFFER = `Senior Platform Engineer at Globex.
We run Kubernetes across three regions and need someone comfortable with
Terraform, observability and on-call rotations. Spanish and English required.`;

const CONTEXT =
  "I have used Kubernetes professionally for about a year. Don't change my job title.";

function joined(messages: { role: string; content: string }[]): string {
  return messages.map((m) => m.content).join("\n");
}

describe("tailorToJobPrompt", () => {
  it("includes the complete job offer, not just a title", () => {
    const text = joined(tailorToJobPrompt(makeCV(), JOB_OFFER));
    expect(text).toContain(JOB_OFFER);
    expect(text).toContain("Terraform, observability and on-call rotations");
  });

  it("includes additional user context and marks it authoritative", () => {
    const text = joined(tailorToJobPrompt(makeCV(), JOB_OFFER, CONTEXT));
    expect(text).toContain(CONTEXT);
    expect(text).toContain("authoritative for this adaptation");
  });

  it("omits the additional-context block when nothing was written", () => {
    const text = joined(tailorToJobPrompt(makeCV(), JOB_OFFER, "   "));
    expect(text).not.toContain("authoritative for this adaptation");
  });

  it("describes additional context as valid factual evidence", () => {
    const text = joined(tailorToJobPrompt(makeCV(), JOB_OFFER, CONTEXT));
    expect(text).toContain(
      "Facts the candidate supplied in Additional context are valid evidence",
    );
    expect(text).toContain("Do not extrapolate them");
  });

  it("prohibits unsupported factual claims", () => {
    const text = joined(tailorToJobPrompt(makeCV(), JOB_OFFER));
    expect(text).toContain(
      "Never introduce a factual claim unless it is supported by the CV or explicitly stated by the candidate",
    );
    expect(text).toContain("Never change dates");
  });

  it("sends the CV with ids so suggestions can address items", () => {
    const text = joined(tailorToJobPrompt(makeCV(), JOB_OFFER));
    expect(text).toContain("sec-exp");
    expect(text).toContain("item-exp");
  });

  it("never sends contact details or hidden sections", () => {
    const text = joined(tailorToJobPrompt(makeCV(), JOB_OFFER));
    expect(text).not.toContain("ada@example.com");
    expect(text).not.toContain("+34 600 000 000");
    expect(text).not.toContain("BSc Mathematics");
  });

  it("declares every supported operation and forbids inventing ids", () => {
    const text = joined(tailorToJobPrompt(makeCV(), JOB_OFFER));
    for (const op of [
      "replace_summary",
      "replace_bullet",
      "add_bullet",
      "remove_bullet",
      "replace_skill_group",
      "replace_meta_title",
      "replace_custom",
    ]) {
      expect(text).toContain(op);
    }
    expect(text).toContain("Never invent an id");
  });
});

describe("buildHandoffPrompt", () => {
  const base = { cv: makeCV(), jobOffer: JOB_OFFER, locale: "en" as const };

  it("is self-contained: CV, offer, rules, schema and output instruction", () => {
    const prompt = buildHandoffPrompt(base);
    expect(prompt).toContain(JOB_OFFER);
    expect(prompt).toContain("Backend engineer.");
    expect(prompt).toContain('"schemaVersion": 1');
    expect(prompt).toContain('"cvId": "cv-1"');
    expect(prompt).toContain("Output only the JSON object");
    expect(prompt).toContain("Never introduce a factual claim");
  });

  it("embeds a fingerprint of the source CV", () => {
    const prompt = buildHandoffPrompt(base);
    const match = prompt.match(/"fingerprint": "([0-9a-f]{8})"/);
    expect(match).not.toBeNull();
  });

  it("includes additional context when provided", () => {
    const prompt = buildHandoffPrompt({ ...base, additionalContext: CONTEXT });
    expect(prompt).toContain(CONTEXT);
  });

  it("writes instructions in the app locale while keeping the CV language", () => {
    const cv = makeCV();
    cv.meta.locale = "en";
    const prompt = buildHandoffPrompt({ ...base, cv, locale: "es" });
    expect(prompt).toContain("Devuelve únicamente el objeto JSON");
    expect(prompt).toContain("Escribe todo el contenido del CV en English");
    expect(prompt).toContain("No lo traduzcas");
  });

  it("excludes contact details and hidden sections", () => {
    const prompt = buildHandoffPrompt(base);
    expect(prompt).not.toContain("ada@example.com");
    expect(prompt).not.toContain("BSc Mathematics");
  });
});
