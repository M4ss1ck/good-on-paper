import type {
  CV,
  SummaryItem,
  ExperienceItem,
  SkillItem,
  EducationItem,
  CustomItem,
} from "../../types/cv";

export interface AIFlag {
  phrase: string;
  location: string;
  sectionId: string;
  itemId?: string;
  reason: string;
  suggestion?: string;
}

interface AIPattern {
  pattern: RegExp;
  reason: string;
  suggestion?: string;
}

const AI_PATTERNS: AIPattern[] = [
  {
    pattern: /—/g,
    reason: "Em dash (common AI tell)",
    suggestion: "use comma, period, or parentheses",
  },
  {
    pattern: /\bleverag(e|ed|ing)\b/gi,
    reason: "Overused AI verb",
    suggestion: '"use", "apply", or "rely on"',
  },
  {
    pattern: /\bpassionate about\b/gi,
    reason: "Generic AI filler",
    suggestion: '"interested in" or "focused on"',
  },
  {
    pattern: /\bresults-driven\b/gi,
    reason: "Buzzword",
    suggestion: "describe specific results instead",
  },
  {
    pattern: /\bsynerg/gi,
    reason: "Corporate jargon",
  },
  {
    pattern: /\bholistic\b/gi,
    reason: "Vague AI word",
  },
  {
    pattern: /\bseamless(ly)?\b/gi,
    reason: "AI favorite adjective",
  },
  {
    pattern: /\brobust\b/gi,
    reason: "AI favorite adjective",
    suggestion: '"reliable" or "solid"',
  },
  {
    pattern: /\bcutting-edge\b/gi,
    reason: "Cliche",
    suggestion: '"modern" or "current"',
  },
  {
    pattern: /\binnovative solutions?\b/gi,
    reason: "Generic AI phrasing",
  },
  {
    pattern: /\bthought leader(ship)?\b/gi,
    reason: "Buzzword",
  },
  {
    pattern: /\bdynamic\b/gi,
    reason: "Vague filler",
  },
  {
    pattern: /\bproactive(ly)?\b/gi,
    reason: "Overused AI adverb",
  },
  {
    pattern: /\bensur(e|ed|ing)\b[^.]*\bsmooth\b/gi,
    reason: "AI cliche combo",
  },
  {
    pattern:
      /\btranslat(e|ed|ing)\b[^.]*\binto\b[^.]*\b(solutions?|results?|outcomes?)\b/gi,
    reason: "AI phrasing pattern",
  },
  {
    pattern: /\bown(ed|ing)?\b[^.]*\bfrom\b[^.]*\bto\b/gi,
    reason: 'AI phrasing: "owning X from A to B"',
  },
  {
    pattern: /\bgenuinely\b/gi,
    reason: "AI filler word",
  },
  {
    pattern: /\bstraightforward\b/gi,
    reason: "AI filler word",
  },
  {
    pattern: /\bhonestly\b/gi,
    reason: "AI filler word",
  },
  {
    pattern: /\bdelve\b/gi,
    reason: "Classic AI verb",
  },
  {
    pattern: /\btapestry\b/gi,
    reason: "AI metaphor",
  },
  {
    pattern: /\blandscape\b/gi,
    reason: "Overused AI metaphor (unless literal)",
  },
  {
    pattern: /\bin today's\b[^.]*\b(world|landscape|environment|market)\b/gi,
    reason: "AI throat-clearing",
  },
];

function scanText(
  text: string,
  location: string,
  sectionId: string,
  itemId: string | undefined,
): AIFlag[] {
  const flags: AIFlag[] = [];
  for (const { pattern, reason, suggestion } of AI_PATTERNS) {
    // Reset lastIndex for global regexes
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      flags.push({
        phrase: match[0],
        location,
        sectionId,
        itemId,
        reason,
        suggestion,
      });
    }
  }
  return flags;
}

export function detectAIPhrases(cv: CV): AIFlag[] {
  const flags: AIFlag[] = [];

  for (const section of cv.sections) {
    if (!section.visible) continue;

    for (const item of section.items) {
      switch (section.type) {
        case "summary": {
          const s = item as SummaryItem;
          if (s.content) {
            flags.push(
              ...scanText(s.content, `${section.title}`, section.id, item.id),
            );
          }
          break;
        }
        case "experience": {
          const e = item as ExperienceItem;
          const prefix = `${section.title} > ${e.role || "Untitled role"}${e.company ? ` at ${e.company}` : ""}`;
          for (let i = 0; i < e.bullets.length; i++) {
            if (e.bullets[i]) {
              flags.push(
                ...scanText(
                  e.bullets[i],
                  `${prefix} > bullet ${i + 1}`,
                  section.id,
                  item.id,
                ),
              );
            }
          }
          break;
        }
        case "skills": {
          const sk = item as SkillItem;
          if (sk.category) {
            flags.push(
              ...scanText(
                sk.category,
                `${section.title} > ${sk.category}`,
                section.id,
                item.id,
              ),
            );
          }
          for (const val of sk.items) {
            if (val) {
              flags.push(
                ...scanText(
                  val,
                  `${section.title} > ${sk.category || "Untitled"} > "${val}"`,
                  section.id,
                  item.id,
                ),
              );
            }
          }
          break;
        }
        case "education": {
          const ed = item as EducationItem;
          const prefix = `${section.title} > ${ed.degree || "Untitled"}`;
          if (ed.notes) {
            flags.push(
              ...scanText(
                ed.notes,
                `${prefix} > notes`,
                section.id,
                item.id,
              ),
            );
          }
          break;
        }
        case "custom": {
          const c = item as CustomItem;
          if (c.content) {
            flags.push(
              ...scanText(
                c.content,
                `${section.title}`,
                section.id,
                item.id,
              ),
            );
          }
          break;
        }
      }
    }
  }

  return flags;
}
