import type { CV } from "../../types/cv";
import type { AppLocale } from "../../i18n";
import { localeToLanguageName } from "../localeToLanguageName";
import { getPromptText } from "./promptText";
import { toAdaptableCV, fingerprintCV } from "./adaptableCV";
import { SUPPORTED_SCHEMA_VERSION } from "../schemas/adaptation";

/**
 * The item fields allowed per section type. Kept as literal JSON keys in every
 * locale — translating them would break the contract.
 */
const ITEM_SHAPES = `Item fields by section "type":
  "summary"    -> { "id": string, "content": string }
  "custom"     -> { "id": string, "content": string }
  "skills"     -> { "id": string, "category": string, "items": array of strings }
  "experience" -> { "id": string, "role": string, "company": string, "location": string, "startDate": string, "endDate": string, "bullets": array of strings }
  "education"  -> { "id": string, "degree": string, "institution": string, "dates": string, "notes": string }
  "languages"  -> { "id": string, "language": string, "level": string }`;

function schemaBlock(cvId: string, fingerprint: string): string {
  return `{
  "schemaVersion": ${SUPPORTED_SCHEMA_VERSION},
  "source": { "cvId": "${cvId}", "fingerprint": "${fingerprint}" },
  "target": { "position": string or null, "company": string or null },
  "cv": {
    "meta": { "title": string, "location": string },
    "sections": [
      {
        "id": string,
        "type": "summary" | "skills" | "experience" | "education" | "languages" | "custom",
        "title": string,
        "items": [ ... ]
      }
    ]
  }
}

${ITEM_SHAPES}`;
}

export interface HandoffPromptInput {
  cv: CV;
  jobOffer: string;
  additionalContext?: string;
  /** App UI locale: the language the instructions are written in. */
  locale: AppLocale;
}

/**
 * A self-contained prompt the user copies into ChatGPT, Claude, Codex, OpenCode
 * or any other capable chat model. Its instructions are written in the app UI
 * locale; the CV content stays in the CV's own language.
 */
export function buildHandoffPrompt({
  cv,
  jobOffer,
  additionalContext,
  locale,
}: HandoffPromptInput): string {
  const text = getPromptText(locale);
  const adaptable = toAdaptableCV(cv);
  const fingerprint = fingerprintCV(cv);
  const cvLanguage = localeToLanguageName(cv.meta.locale ?? "en");
  const context = additionalContext?.trim();

  const parts = [
    text.handoffIntro,
    text.targeting,
    text.precedence,
    text.factualRules,
    text.handoffIdRule,
    text.handoffContentLanguage(cvLanguage),
    `--- ${text.cvLabel} (JSON) ---\n${JSON.stringify(adaptable, null, 2)}`,
    `--- ${text.jobOfferLabel} ---\n${jobOffer.trim()}`,
  ];

  if (context) {
    parts.push(`--- ${text.additionalContextLabel} ---\n${context}`);
  }

  parts.push(
    `--- ${text.handoffSchemaIntro} ---\n${schemaBlock(cv.id, fingerprint)}`,
    text.handoffOutputRule,
  );

  return parts.join("\n\n");
}
