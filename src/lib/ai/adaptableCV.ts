import type {
  CV,
  Section,
  SummaryItem,
  SkillItem,
  ExperienceItem,
  EducationItem,
  LanguageItem,
  CustomItem,
} from "../../types/cv";
import type {
  AdaptableCV,
  AdaptableItem,
  AdaptableSection,
} from "../schemas/adaptation";

function toAdaptableItem(section: Section, item: unknown): AdaptableItem {
  switch (section.type) {
    case "summary": {
      const i = item as SummaryItem;
      return { id: i.id, content: i.content };
    }
    case "custom": {
      const i = item as CustomItem;
      return { id: i.id, content: i.content };
    }
    case "skills": {
      const i = item as SkillItem;
      return { id: i.id, category: i.category, items: i.items };
    }
    case "experience": {
      const i = item as ExperienceItem;
      return {
        id: i.id,
        role: i.role,
        company: i.company,
        location: i.location,
        startDate: i.startDate,
        endDate: i.endDate,
        bullets: i.bullets,
      };
    }
    case "education": {
      const i = item as EducationItem;
      return {
        id: i.id,
        degree: i.degree,
        institution: i.institution,
        dates: i.dates,
        notes: i.notes ?? "",
      };
    }
    case "languages": {
      const i = item as LanguageItem;
      return { id: i.id, language: i.language, level: i.level };
    }
  }
}

/**
 * The AI-safe view of a CV: adaptable content only. Excludes PII, persistence
 * metadata, app settings and section visibility flags. Hidden sections are left
 * out entirely — hiding a section is a deliberate user decision.
 */
export function toAdaptableCV(cv: CV): AdaptableCV {
  const sections: AdaptableSection[] = cv.sections
    .filter((s) => s.visible)
    .map((s) => ({
      id: s.id,
      type: s.type,
      title: s.title,
      items: s.items.map((item) => toAdaptableItem(s, item)),
    }));

  return {
    meta: { title: cv.meta.title, location: cv.meta.location },
    sections,
  };
}

/** JSON with deterministic key ordering, so the fingerprint is stable. */
export function canonicalize(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return `[${value.map(canonicalize).join(",")}]`;
  }
  const entries = Object.entries(value as Record<string, unknown>)
    .filter(([, v]) => v !== undefined)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  return `{${entries
    .map(([k, v]) => `${JSON.stringify(k)}:${canonicalize(v)}`)
    .join(",")}}`;
}

/**
 * FNV-1a over the canonical form. Not cryptographic on purpose: this only has
 * to answer "did the CV change since the prompt was generated".
 */
export function hashString(input: string): string {
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export function fingerprintCV(cv: CV): string {
  return hashString(canonicalize(toAdaptableCV(cv)));
}
