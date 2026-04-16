import type {
  CV,
  Section,
  ExperienceItem,
  SkillItem,
  EducationItem,
  SummaryItem,
  LanguageItem,
  CustomItem,
} from "../../types/cv";
import { localeToLanguageName } from "../localeToLanguageName";

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

export interface TailorSuggestion {
  section: string;
  action: string;
  current: string | null;
  suggested: string;
  reason: string;
}

export function tailorToJobPrompt(
  cv: CV,
  jobDescription: string,
): { role: string; content: string }[] {
  const cvText = serializeCVToText(cv);

  return [
    {
      role: "system",
      content: `You are a CV optimization expert. Given a CV and a job description, suggest specific, actionable changes to tailor the CV for the job. For each suggestion, specify:
- Which section to modify (summary, skills, a specific experience entry, education)
- What to change (add, reword, emphasize, reorder)
- The exact text to use

Respond in JSON format:
{
  "suggestions": [
    {
      "section": "summary",
      "action": "rewrite",
      "current": "current text or null if adding new",
      "suggested": "new text",
      "reason": "brief explanation"
    }
  ]
}

Keep suggestions practical. Don't invent experience the candidate doesn't have. Focus on keyword alignment, emphasis shifts, and phrasing that matches the JD's language. Do not use AI-sounding phrases like "leveraging", "passionate", "results-driven". Write like a human. No em dashes. ${localeInstruction(cv)}`,
    },
    {
      role: "user",
      content: `My CV:\n${cvText}\n\nJob description:\n${jobDescription}\n\nSuggest tailoring changes.`,
    },
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
