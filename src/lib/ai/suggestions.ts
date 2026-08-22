import type { CV, ExperienceItem, SkillItem, Section } from "../../types/cv";
import {
  suggestionSchema,
  tailorResponseSchema,
  type Suggestion,
  type TailorTarget,
} from "../schemas/adaptation";
import { formatIssues } from "../schemas/cv";

// ── Parsing ────────────────────────────────────────────────

export type ParsedTailorResponse =
  | {
      kind: "ok";
      target: TailorTarget | null;
      suggestions: Suggestion[];
      /** Entries the model returned that failed validation and were dropped. */
      skipped: number;
    }
  | { kind: "not-json"; raw: string }
  | { kind: "bad-shape"; issues: string[]; raw: string };

export function stripMarkdownFences(text: string): string {
  return text
    .trim()
    .replace(/^```(?:json)?\s*\n?/i, "")
    .replace(/\n?```\s*$/i, "");
}

export function parseTailorResponse(raw: string): ParsedTailorResponse {
  let json: unknown;
  try {
    json = JSON.parse(stripMarkdownFences(raw));
  } catch {
    return { kind: "not-json", raw };
  }

  const envelope = tailorResponseSchema.safeParse(json);
  if (!envelope.success) {
    return { kind: "bad-shape", issues: formatIssues(envelope.error), raw };
  }

  const suggestions: Suggestion[] = [];
  let skipped = 0;
  for (const candidate of envelope.data.suggestions) {
    const result = suggestionSchema.safeParse(candidate);
    if (result.success) {
      suggestions.push(result.data);
    } else {
      skipped++;
    }
  }

  return {
    kind: "ok",
    target: envelope.data.target ?? null,
    suggestions,
    skipped,
  };
}

// ── Resolution against the current CV ──────────────────────

export type ResolutionFailure =
  | "section-missing"
  | "item-missing"
  | "bullet-missing"
  | "type-mismatch";

export type Resolution =
  | { ok: true }
  | { ok: false; reason: ResolutionFailure };

const OP_SECTION_TYPE = {
  replace_summary: "summary",
  replace_bullet: "experience",
  add_bullet: "experience",
  remove_bullet: "experience",
  replace_skill_group: "skills",
  replace_custom: "custom",
} as const;

function findSection(cv: CV, sectionId: string): Section | undefined {
  return cv.sections.find((s) => s.id === sectionId);
}

/**
 * Where a bullet suggestion actually points right now. Prefers matching the
 * model's `current` text so pending suggestions stay correct after an earlier
 * accepted suggestion added or removed a bullet and shifted the indexes.
 */
export function bulletIndexOf(
  cv: CV,
  suggestion: Extract<Suggestion, { op: "replace_bullet" | "remove_bullet" }>,
): number | null {
  const section = findSection(cv, suggestion.sectionId);
  const item = section?.items.find((i) => i.id === suggestion.itemId) as
    | ExperienceItem
    | undefined;
  const bullets = item?.bullets;
  if (!bullets) return null;

  if (suggestion.current) {
    const byText = bullets.indexOf(suggestion.current);
    if (byText !== -1) return byText;
  }
  return suggestion.bulletIndex < bullets.length ? suggestion.bulletIndex : null;
}

/** Can this suggestion actually be applied to the CV as it stands? */
export function resolveSuggestion(cv: CV, suggestion: Suggestion): Resolution {
  if (suggestion.op === "replace_meta_title") return { ok: true };

  const section = findSection(cv, suggestion.sectionId);
  if (!section) return { ok: false, reason: "section-missing" };
  if (section.type !== OP_SECTION_TYPE[suggestion.op]) {
    return { ok: false, reason: "type-mismatch" };
  }

  const item = section.items.find((i) => i.id === suggestion.itemId);
  if (!item) return { ok: false, reason: "item-missing" };

  if (suggestion.op === "replace_bullet" || suggestion.op === "remove_bullet") {
    if (bulletIndexOf(cv, suggestion) === null) {
      return { ok: false, reason: "bullet-missing" };
    }
  }

  return { ok: true };
}

// ── Display helpers ────────────────────────────────────────

/** The text a suggestion replaces, read from the CV rather than trusted from the model. */
export function currentTextOf(cv: CV, suggestion: Suggestion): string | null {
  if (suggestion.op === "replace_meta_title") return cv.meta.title || null;

  const section = findSection(cv, suggestion.sectionId);
  const item = section?.items.find((i) => i.id === suggestion.itemId);
  if (!item) return null;

  switch (suggestion.op) {
    case "replace_summary":
    case "replace_custom":
      return "content" in item ? item.content : null;
    case "replace_bullet":
    case "remove_bullet": {
      const index = bulletIndexOf(cv, suggestion);
      return index === null
        ? null
        : ((item as ExperienceItem).bullets[index] ?? null);
    }
    case "replace_skill_group":
      return (item as SkillItem).items.join(", ");
    case "add_bullet":
      return null;
  }
}

export function suggestedTextOf(suggestion: Suggestion): string {
  switch (suggestion.op) {
    case "replace_skill_group":
      return suggestion.suggested.join(", ");
    case "remove_bullet":
      return "";
    default:
      return suggestion.suggested;
  }
}

/** Which section a suggestion touches, for the card header. */
export function sectionLabelOf(cv: CV, suggestion: Suggestion): string {
  if (suggestion.op === "replace_meta_title") return cv.meta.title || "Title";
  return findSection(cv, suggestion.sectionId)?.title ?? suggestion.sectionId;
}
