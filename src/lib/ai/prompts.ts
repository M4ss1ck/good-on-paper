import type {
  CV,
  Section,
  ExperienceItem,
  SkillItem,
  EducationItem,
  SummaryItem,
  LanguageItem,
  CustomItem,
  SectionType,
} from "../../types/cv";
import { localeToLanguageName } from "../localeToLanguageName";
import { getPromptText } from "./promptText";
import { toAdaptableCV } from "./adaptableCV";

function localeInstruction(cv: CV): string {
  return `The CV is written in ${localeToLanguageName(cv.meta.locale ?? "en")}. Respond in the same language.`;
}

function getSectionsByType(cv: CV, type: string): Section[] {
  return cv.sections.filter((s) => s.type === type && s.visible);
}

export function generateSummaryPrompt(
  cv: CV,
): { role: string; content: string }[] {
  const experience = getSectionsByType(cv, "experience")
    .flatMap((s) => s.items as ExperienceItem[])
    .map(
      (e) =>
        `${e.role} at ${e.company} (${e.startDate} – ${e.endDate}): ${e.bullets.join(". ")}`,
    )
    .join("\n");

  const skills = getSectionsByType(cv, "skills")
    .flatMap((s) => s.items as SkillItem[])
    .map((s) => `${s.category}: ${s.items.join(", ")}`)
    .join("\n");

  const education = getSectionsByType(cv, "education")
    .flatMap((s) => s.items as EducationItem[])
    .map((e) => `${e.degree} – ${e.institution}`)
    .join("\n");

  return [
    {
      role: "system",
      content: `You are a professional CV writer. Write a concise professional summary (3-4 sentences) for a CV based on the candidate's experience, skills, and education. Write in first person. Be specific, not generic. Avoid cliches like "passionate", "results-driven", "leveraging". Do not use em dashes. The summary should sound like a real person wrote it, not an AI. ${localeInstruction(cv)}`,
    },
    {
      role: "user",
      content: `Here is my experience:\n${experience}\n\nSkills:\n${skills}\n\nEducation:\n${education}\n\nWrite my professional summary.`,
    },
  ];
}

export function serializeCVToText(cv: CV): string {
  const lines: string[] = [];

  // Meta
  const m = cv.meta;
  if (m.name) lines.push(m.name);
  if (m.title) lines.push(m.title);
  const contact = [m.email, m.phone, m.location].filter(Boolean).join(" | ");
  if (contact) lines.push(contact);
  if (m.links.length > 0) {
    lines.push(m.links.map((l) => `${l.label}: ${l.url}`).join(" | "));
  }
  lines.push("");

  for (const section of cv.sections) {
    if (!section.visible) continue;
    lines.push(`## ${section.title}`);

    for (const item of section.items) {
      switch (section.type) {
        case "summary": {
          const s = item as SummaryItem;
          if (s.content) lines.push(s.content);
          break;
        }
        case "experience": {
          const e = item as ExperienceItem;
          lines.push(
            `${e.role} at ${e.company}${e.location ? `, ${e.location}` : ""} (${e.startDate} - ${e.endDate})`,
          );
          for (const b of e.bullets) {
            if (b) lines.push(`  - ${b}`);
          }
          break;
        }
        case "skills": {
          const sk = item as SkillItem;
          if (sk.category || sk.items.length > 0) {
            lines.push(`${sk.category}: ${sk.items.join(", ")}`);
          }
          break;
        }
        case "education": {
          const ed = item as EducationItem;
          lines.push(
            `${ed.degree} - ${ed.institution}${ed.dates ? ` (${ed.dates})` : ""}`,
          );
          if (ed.notes) lines.push(`  ${ed.notes}`);
          break;
        }
        case "languages": {
          const l = item as LanguageItem;
          if (l.language) lines.push(`${l.language}: ${l.level}`);
          break;
        }
        case "custom": {
          const c = item as CustomItem;
          if (c.content) lines.push(c.content);
          break;
        }
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

// ── Tailor to job (BYOK, suggestion-based) ─────────────────

/**
 * The exact JSON contract the model must follow. Kept in English: BYOK prompts
 * are machine-facing and never shown to the user.
 */
const SUGGESTION_FORMAT = `Respond with a single JSON object and nothing else. No markdown fences, no commentary.

{
  "target": { "position": string or null, "company": string or null },
  "suggestions": [ ... ]
}

Fill "target" by reading the job offer; it is used to name the adapted CV. Use null when the offer does not state it.

Every entry of "suggestions" must match one of these shapes exactly:

{ "op": "replace_summary", "sectionId": string, "itemId": string, "current": string, "suggested": string, "reason": string }
{ "op": "replace_bullet", "sectionId": string, "itemId": string, "bulletIndex": integer, "current": string, "suggested": string, "reason": string }
{ "op": "add_bullet", "sectionId": string, "itemId": string, "suggested": string, "reason": string }
{ "op": "remove_bullet", "sectionId": string, "itemId": string, "bulletIndex": integer, "current": string, "reason": string }
{ "op": "replace_skill_group", "sectionId": string, "itemId": string, "suggested": array of strings, "reason": string }
{ "op": "replace_meta_title", "current": string, "suggested": string, "reason": string }
{ "op": "replace_custom", "sectionId": string, "itemId": string, "current": string, "suggested": string, "reason": string }

Rules for suggestions:
- "sectionId" and "itemId" must be copied verbatim from the CV JSON below. Never invent an id.
- "bulletIndex" is the zero-based position of the bullet inside that item's "bullets" array.
- "current" must be the existing text, copied verbatim, so the candidate can see what changes.
- "replace_skill_group" replaces the whole "items" array of one skill category. Use it to reorder or reword skills, not to add technologies the candidate has not used.
- Use no other "op" value. Anything else is discarded.
- Return at most 20 suggestions, most valuable first.
- Return an empty "suggestions" array if the CV already fits the offer.`;

export function tailorToJobPrompt(
  cv: CV,
  jobOffer: string,
  additionalContext?: string,
): { role: string; content: string }[] {
  const text = getPromptText("en");
  const adaptable = toAdaptableCV(cv);
  const context = additionalContext?.trim();

  const systemParts = [
    "You are a CV adaptation expert. You suggest precise, individually reviewable edits that tailor a CV to one specific job offer.",
    text.targeting,
    text.precedence,
    text.factualRules,
    SUGGESTION_FORMAT,
    localeInstruction(cv),
  ];

  const userParts = [
    `${text.cvLabel} (JSON):\n${JSON.stringify(adaptable)}`,
    `${text.jobOfferLabel}:\n${jobOffer}`,
  ];

  if (context) {
    userParts.push(
      `${text.additionalContextLabel} (written by the candidate, authoritative for this adaptation):\n${context}`,
    );
  }

  return [
    { role: "system", content: systemParts.join("\n\n") },
    { role: "user", content: userParts.join("\n\n") },
  ];
}


export function improveBulletPrompt(
  bullet: string,
  role: string,
  company: string,
  locale?: string,
): { role: string; content: string }[] {
  const lang = localeToLanguageName(locale ?? "en");
  return [
    {
      role: "system",
      content: `You are a CV writing expert. Rewrite the following bullet point to be more impactful and specific. Use active verbs. Quantify results where possible. Keep it to one sentence, two at most. Do not use buzzwords, em dashes, or AI-sounding language. Write like a real person describing their work to a colleague. The CV is written in ${lang}. Respond in the same language.`,
    },
    {
      role: "user",
      content: `Role: ${role} at ${company}\nOriginal bullet: "${bullet}"\n\nRewrite this bullet.`,
    },
  ];
}

// ── CV Translation ─────────────────────────────────────────

interface TranslatableSection {
  type: SectionType;
  title: string;
  items: unknown[];
}

interface TranslatableCV {
  meta: { title: string; location: string };
  sections: TranslatableSection[];
}

export function serializeCVForTranslation(cv: CV): TranslatableCV {
  return {
    meta: {
      title: cv.meta.title,
      location: cv.meta.location,
    },
    sections: cv.sections.map((s) => ({
      type: s.type,
      title: s.title,
      items: s.items.map((item) => {
        switch (s.type) {
          case "summary":
            return { content: (item as SummaryItem).content };
          case "skills":
            return {
              category: (item as SkillItem).category,
              items: (item as SkillItem).items,
            };
          case "experience": {
            const e = item as ExperienceItem;
            return {
              role: e.role,
              company: e.company,
              location: e.location,
              bullets: e.bullets,
            };
          }
          case "education": {
            const ed = item as EducationItem;
            return {
              degree: ed.degree,
              institution: ed.institution,
              notes: ed.notes ?? "",
            };
          }
          case "languages": {
            const l = item as LanguageItem;
            return { language: l.language, level: l.level };
          }
          case "custom":
            return { content: (item as CustomItem).content };
        }
      }),
    })),
  };
}

export function translateCVPrompt(
  cv: CV,
  targetLocale: string,
): { role: string; content: string }[] {
  const serialized = serializeCVForTranslation(cv);
  const sourceLang = localeToLanguageName(cv.meta.locale ?? "en");
  const targetLang = localeToLanguageName(targetLocale);

  return [
    {
      role: "system",
      content: `You are a professional translator specializing in CVs and resumes. Translate the following CV content from ${sourceLang} to ${targetLang}.

Rules:
- Translate faithfully. Do not add, remove, or embellish content.
- Preserve proper nouns: company names, technology names, city names, institution names, programming languages.
- Keep the same professional tone.
- Return ONLY valid JSON with the exact same structure as the input. No markdown fences, no explanation, no extra text.
- Every key in the input must appear in your output.`,
    },
    {
      role: "user",
      content: JSON.stringify(serialized),
    },
  ];
}

export function deserializeTranslation(
  originalCV: CV,
  translatedJson: string,
): { cv: CV; warnings: string[] } {
  const warnings: string[] = [];
  const clone: CV = JSON.parse(JSON.stringify(originalCV));

  let parsed: TranslatableCV;
  try {
    parsed = JSON.parse(translatedJson);
  } catch {
    throw new Error("JSON_PARSE_FAILED");
  }

  // Apply meta
  if (parsed.meta) {
    if (typeof parsed.meta.title === "string") clone.meta.title = parsed.meta.title;
    if (typeof parsed.meta.location === "string") clone.meta.location = parsed.meta.location;
  }

  // Apply sections
  if (!Array.isArray(parsed.sections)) {
    warnings.push("Missing sections array. Kept original content.");
    return { cv: clone, warnings };
  }

  for (let si = 0; si < clone.sections.length; si++) {
    const origSection = clone.sections[si];
    const transSection = parsed.sections[si];
    if (!transSection) {
      warnings.push(`Section "${origSection.title}" not translated`);
      continue;
    }

    if (typeof transSection.title === "string") {
      origSection.title = transSection.title;
    }

    if (!Array.isArray(transSection.items)) continue;

    for (let ii = 0; ii < origSection.items.length; ii++) {
      const transItem = transSection.items[ii] as Record<string, unknown> | undefined;
      if (!transItem) continue;

      switch (origSection.type) {
        case "summary": {
          const item = origSection.items[ii] as SummaryItem;
          if (typeof transItem.content === "string") item.content = transItem.content;
          break;
        }
        case "skills": {
          const item = origSection.items[ii] as SkillItem;
          if (typeof transItem.category === "string") item.category = transItem.category;
          if (Array.isArray(transItem.items)) item.items = transItem.items as string[];
          break;
        }
        case "experience": {
          const item = origSection.items[ii] as ExperienceItem;
          if (typeof transItem.role === "string") item.role = transItem.role;
          if (typeof transItem.company === "string") item.company = transItem.company;
          if (typeof transItem.location === "string") item.location = transItem.location;
          if (Array.isArray(transItem.bullets)) item.bullets = transItem.bullets as string[];
          break;
        }
        case "education": {
          const item = origSection.items[ii] as EducationItem;
          if (typeof transItem.degree === "string") item.degree = transItem.degree;
          if (typeof transItem.institution === "string") item.institution = transItem.institution;
          if (typeof transItem.notes === "string") item.notes = transItem.notes;
          break;
        }
        case "languages": {
          const item = origSection.items[ii] as LanguageItem;
          if (typeof transItem.language === "string") item.language = transItem.language;
          if (typeof transItem.level === "string") item.level = transItem.level;
          break;
        }
        case "custom": {
          const item = origSection.items[ii] as CustomItem;
          if (typeof transItem.content === "string") item.content = transItem.content;
          break;
        }
      }
    }

    if (transSection.items.length < origSection.items.length) {
      warnings.push(`Section "${origSection.title}": only ${transSection.items.length}/${origSection.items.length} items translated`);
    }
  }

  return { cv: clone, warnings };
}
