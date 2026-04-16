import type {
  CV,
  Section,
  ExperienceItem,
  SkillItem,
  EducationItem,
} from "../../types/cv";

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
      content: `You are a professional CV writer. Write a concise professional summary (3-4 sentences) for a CV based on the candidate's experience, skills, and education. Write in first person. Be specific, not generic. Avoid cliches like "passionate", "results-driven", "leveraging". Do not use em dashes. The summary should sound like a real person wrote it, not an AI.`,
    },
    {
      role: "user",
      content: `Here is my experience:\n${experience}\n\nSkills:\n${skills}\n\nEducation:\n${education}\n\nWrite my professional summary.`,
    },
  ];
}
